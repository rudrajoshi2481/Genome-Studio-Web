"use client"
import React, { useState } from 'react'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { PlayIcon, XIcon, Loader2, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNodeStore } from './nodeStore'
import { useAuthStore } from '@/lib/stores/auth-store'
import TagInput from './TagInput'
import { toast } from "sonner"
import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogContent
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'
import SimpleCodeEditor from './SimpleCodeEditor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { host, port } from '@/config/server'

// Define interfaces for proper type safety
interface NodeIO {
  id: string;
  name: string;
  type: string;
}

interface NodePosition {
  x: number;
  y: number;
}

interface NodeData {
  title: string;
  description?: string;
  language: string;
  function_name: string;
  source: string;
  inputs: NodeIO[];
  outputs: NodeIO[];
}

interface TestResultNode {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
}

interface TestResult {
  status: string;
  message?: string;
  node: TestResultNode;
}

interface NodeCreatePayload {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
  tags: string[];
  is_public: boolean;
}

// Custom large dialog content component
const LargeDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 flex flex-col w-[80vw] h-[80vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <XIcon className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
LargeDialogContent.displayName = "LargeDialogContent"

interface CustomNodeProps {
  onSaveSuccess?: () => void;
  nodeToEdit?: any; // The node to edit if in edit mode
  isOpen?: boolean; // Control dialog open state from parent
  onOpenChange?: (open: boolean) => void; // Callback when dialog open state changes
  hideCreateButton?: boolean; // Whether to hide the create button (for edit mode)
}

function CustomNode({ onSaveSuccess, nodeToEdit, isOpen, onOpenChange, hideCreateButton = false }: CustomNodeProps) {
  // Use the node store for state management
  const { 
    nodeName, setNodeName,
    nodeLanguage, setNodeLanguage,
    description, setDescription,
    tags, setTags, addTag, removeTag,
    code, setCode,
    resetNode
  } = useNodeStore()
  
  // State for test results
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  
  // State for saving node
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // State to track if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [editNodeId, setEditNodeId] = useState<string | number | null>(null)
  
  // Helper function to validate and normalize NodeIO objects
  const normalizeNodeIO = (items: any[]): NodeIO[] => {
    if (!Array.isArray(items)) return [];
    
    return items.map((item, index) => ({
      id: item?.id || `item_${Date.now()}_${index}`,
      name: item?.name || `item_${index + 1}`,
      type: item?.type || 'any'
    }));
  }
  
  // Initialize form with nodeToEdit data when in edit mode
  React.useEffect(() => {
    if (nodeToEdit) {
      console.log('Initializing form with node data:', nodeToEdit);
      setIsEditMode(true);
      setEditNodeId(nodeToEdit.id || nodeToEdit.node_id);
      
      // Set form fields from node data
      setNodeName(nodeToEdit.title || '');
      setDescription(nodeToEdit.description || '');
      setNodeLanguage((nodeToEdit.language || 'python').charAt(0).toUpperCase() + (nodeToEdit.language || 'python').slice(1) as 'Python' | 'R');
      setCode(nodeToEdit.source_code || '');
      
      // Set tags if available
      if (Array.isArray(nodeToEdit.tags)) {
        // Reset tags first
        const currentTags = [...tags];
        currentTags.forEach(tag => removeTag(tag));
        
        // Then add new tags
        nodeToEdit.tags.forEach((tag: string) => addTag(tag));
      }
    } else {
      setIsEditMode(false);
      setEditNodeId(null);
    }
  }, [nodeToEdit]);
  
  // Reset form when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Only reset if we're not in edit mode or if we're explicitly closing
      if (!isEditMode) {
        resetNode();
      }
      setSaveSuccess(false);
      setTestResult(null);
      setTestError(null);
    }
    
    // Call parent's onOpenChange if provided
    if (onOpenChange) {
      onOpenChange(open);
    }
  };
  
  // Function to test the node code
  const handleTestCode = async () => {
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    setSaveSuccess(false)
    
    // Show loading toast
    const loadingToast = toast.loading('Testing node code...')
    
    try {
      // Prepare the request payload
      const payload = {
        code: code,
        id: `node_${Date.now()}`, // Generate a unique ID
        position: {
          x: 100,
          y: 200
        }
      }
      
      // Make the API call
      const response = await fetch(`http://${host}:${port}/api/v1/workflow-manager/execute/function/convert-to-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      // Parse the response
      const data = await response.json()
      console.log('API Response:', data)
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (data.status === 'success') {
        // Validate and normalize the test result
        const normalizedResult: TestResult = {
          status: data.status,
          message: data.message,
          node: {
            id: data.node?.id || `node_${Date.now()}`,
            type: data.node?.type || 'custom',
            position: data.node?.position || { x: 100, y: 100 },
            data: {
              title: data.node?.data?.title || 'Custom Node',
              description: data.node?.data?.description || '',
              language: nodeLanguage.toLowerCase(),
              function_name: data.node?.data?.function_name || 'custom_function',
              source: data.node?.data?.source || code,
              inputs: normalizeNodeIO(data.node?.data?.inputs || []),
              outputs: normalizeNodeIO(data.node?.data?.outputs || [])
            }
          }
        }
        
        setTestResult(normalizedResult)
        toast.success('Node code tested successfully!')
      } else {
        setTestError(data.message || 'Error analyzing node code')
        toast.error(data.message || 'Error analyzing node code')
      }
    } catch (error) {
      console.error('Error testing node:', error)
      const errorMessage = 'Failed to connect to the API. Make sure the server is running.'
      setTestError(errorMessage)
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
    } finally {
      setTestLoading(false)
    }
  }
  
  // Function to save the node to the database
  const handleSaveNode = async () => {
    console.log('Save button clicked')
    
    // In edit mode, we might not need to test the node again if we're just updating metadata
    if (!isEditMode && !testResult) {
      console.log('No test result available, cannot save')
      toast.error('Please test the node before saving')
      setTestError('Please test the node before saving')
      return
    }
    
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      // Get the authentication token from the auth store
      const token = useAuthStore.getState().token
      console.log('Auth token exists:', !!token)
      
      if (!token) {
        console.error('Authentication token not found')
        toast.error('Authentication token not found. Please log in again.')
        setSaveError('Authentication token not found. Please log in again.')
        setIsSaving(false)
        return
      }
      
      // Show loading toast
      const loadingToast = toast.loading(isEditMode ? 'Updating custom node...' : 'Saving custom node...')
      
      if (isEditMode) {
        // UPDATE EXISTING NODE
        console.log('Updating existing node with ID:', editNodeId)
        
        // Create update payload with only the fields we want to update
        const updatePayload: {
          title: string;
          description: string;
          source_code: string;
          function_name?: string;
          language: string;
          tags: string[];
          is_public: boolean;
          inputs?: any[];
          outputs?: any[];
        } = {
          title: nodeName,
          description: description,
          source_code: code,
          function_name: nodeToEdit?.function_name,
          language: nodeLanguage.toLowerCase(),
          tags: Array.isArray(tags) ? tags : [],
          is_public: nodeToEdit?.is_public || false
        }
        
        // If we have test results, include inputs and outputs
        if (testResult && testResult.node && testResult.node.data) {
          const formattedInputs = testResult.node.data.inputs.map((input: any) => ({
            id: input.id || `input_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: input.name || 'input',
            type: input.type || 'any'
          }));
          
          const formattedOutputs = testResult.node.data.outputs.map((output: any) => ({
            id: output.id || `output_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: output.name || 'output',
            type: output.type || 'any'
          }));
          
          updatePayload.inputs = formattedInputs;
          updatePayload.outputs = formattedOutputs;
        }
        
        console.log('Update payload:', JSON.stringify(updatePayload, null, 2))
        
        try {
          // Import the updateCustomNode function from the service
          const { updateCustomNode } = await import('@/lib/services/custom-node-service');
          
          // Call the service function to update the node
          if (editNodeId !== null) {
            const updatedNode = await updateCustomNode(token, editNodeId, updatePayload);
            console.log('Node updated successfully:', updatedNode);
          } else {
            throw new Error('Node ID is missing for update operation');
          }
          
          // Show success toast
          toast.dismiss(loadingToast);
          toast.success('Custom node updated successfully!');
          
          setSaveSuccess(true);
          
          // Call the onSaveSuccess callback if provided
          if (onSaveSuccess) {
            onSaveSuccess();
          }
          
          // Close dialog after successful update
          if (onOpenChange) {
            setTimeout(() => {
              onOpenChange(false);
              setSaveSuccess(false);
            }, 1500);
          }
        } catch (error) {
          console.error('Error updating node:', error);
          toast.dismiss(loadingToast);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update custom node';
          toast.error(errorMessage);
          setSaveError(errorMessage);
        }
      } else {
        // CREATE NEW NODE
        console.log('Creating new node')
        
        // Validate test result structure
        if (!testResult || !testResult.node || !testResult.node.id || !testResult.node.data) {
          console.error('Test result is missing required fields')
          toast.error('Invalid node data structure. Please test the node again.')
          setSaveError('Invalid node data structure. Please test the node again.')
          setIsSaving(false)
          toast.dismiss(loadingToast)
          return
        }
        
        // Create the payload that matches the backend NodeCreateSchema exactly
        // Ensure inputs and outputs are properly formatted with id, name, and type fields
        const formattedInputs = testResult.node.data.inputs.map((input: any) => ({
          id: input.id || `input_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: input.name || 'input',
          type: input.type || 'any'
        }));
        
        const formattedOutputs = testResult.node.data.outputs.map((output: any) => ({
          id: output.id || `output_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: output.name || 'output',
          type: output.type || 'any'
        }));
        
        // Create a plain JavaScript object (not a class instance) to ensure it serializes properly
        // Note: We don't include an ID as the backend will generate one
        const savePayload = {
          type: testResult.node.type,
          position: {
            x: testResult.node.position.x,
            y: testResult.node.position.y
          },
          data: {
            title: nodeName || testResult.node.data.title,
            // Prioritize the description from the store
            description: description || '',
            language: nodeLanguage.toLowerCase(),
            function_name: testResult.node.data.function_name,
            source: code, // Use the current code from the editor
            inputs: formattedInputs,
            outputs: formattedOutputs
          },
          tags: Array.isArray(tags) ? tags : [],
          is_public: false
        }
        
        console.log('Node data to save:', JSON.stringify(savePayload, null, 2))
        
        // Validate required fields before sending
        if (!savePayload.data.function_name) {
          console.error('Missing function_name in node data')
          toast.error('Invalid node data: missing function name')
          setSaveError('Invalid node data: missing function name')
          setIsSaving(false)
          toast.dismiss(loadingToast)
          return
        }
        
        // Make the API call to save the node
        console.log('Making API call to save node')
        
        const response = await fetch(`http://${host}:${port}/api/v1/workflow-manager/custom-nodes/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          },
          body: JSON.stringify(savePayload)
        })
        
        console.log('API response status:', response.status)
        
        // Get the response text first to ensure we can see it even if JSON parsing fails
        const responseText = await response.text()
        console.log('Raw API response:', responseText)
        
        // Dismiss the loading toast
        toast.dismiss(loadingToast)
        
        if (response.ok) {
          try {
            const data = JSON.parse(responseText)
            console.log('Node saved successfully:', data)
            
            // Show success toast
            toast.success('Custom node saved successfully!')
            
            setSaveSuccess(true)
            
            // Call the onSaveSuccess callback if provided
            if (onSaveSuccess) {
              onSaveSuccess()
            }
            
            // Reset form after successful save
            setTimeout(() => {
              resetNode()
              setSaveSuccess(false)
            }, 2000)
          } catch (parseError) {
            console.error('Error parsing success response:', parseError)
            toast.error('Server returned success but response format was invalid')
            setSaveError('Server returned success but response format was invalid')
          }
        } else {
          try {
            const errorData = JSON.parse(responseText)
            console.error('Error saving node:', response.status, errorData)
            const errorMessage = `Failed to save node: ${errorData.detail || 'Unknown error'}`
            toast.error(errorMessage)
            setSaveError(errorMessage)
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
            const errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`
            toast.error(errorMessage)
            setSaveError(errorMessage)
          }
        }
      }
    } catch (error) {
      console.error('Error saving node:', error)
      toast.error('Failed to connect to the API. Make sure the server is running.')
      setSaveError('Failed to connect to the API. Make sure the server is running.')
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      {!hideCreateButton && !isEditMode && (
        <DialogTrigger asChild>
          <Button className="m-5">
            Create Custom Node
          </Button>
        </DialogTrigger>
      )}
      
      <LargeDialogContent>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditMode ? 'Edit Custom Node' : 'Create Custom Node'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Edit your custom node properties and code.' : 'Create a custom node with Python or R code.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Sidebar */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-muted/10">
              <div className="p-4 h-full overflow-y-auto">
                <h3 className="font-medium mb-3">Properties</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Node Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded-md text-sm" 
                      placeholder="Enter name..." 
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea 
                      className="w-full px-3 py-2 border rounded-md text-sm" 
                      placeholder="Enter description..." 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={nodeLanguage}
                      onChange={(e) => setNodeLanguage(e.target.value as 'Python' | 'R')}
                    >
                      <option>Python</option>
                      <option>R</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <TagInput
                      tags={tags}
                      onAddTag={addTag}
                      onRemoveTag={removeTag}
                      placeholder="Add a tag..."
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Main content area */}
            <ResizablePanel defaultSize={75} className="overflow-hidden">
              <div className="h-full">
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Code Editor Section */}
                  <ResizablePanel defaultSize={60} minSize={30} className="overflow-hidden">
                    <div className="p-4 h-full overflow-hidden flex flex-col">
                      <h3 className="font-medium mb-2 px-2">Node Code</h3>
                      <div className="flex-1 border rounded-md overflow-hidden">
                        <SimpleCodeEditor 
                          value={code} 
                          onChange={setCode} 
                          extension={nodeLanguage.toLowerCase()} 
                        />
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button 
                          variant="outline" 
                          onClick={handleTestCode}
                          disabled={testLoading}
                        >
                          <div className="flex items-center gap-2">
                            {testLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PlayIcon className="w-4 h-4" />
                            )}
                            Test Node
                          </div>
                        </Button>
                      </div>
                    </div>
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle />
                  
                  {/* Node Connections Section */}
                  <ResizablePanel defaultSize={40} minSize={20} className="overflow-hidden">
                    <div className="p-4 h-full overflow-hidden flex flex-col">
                      <h3 className="font-medium px-2">Node Connections</h3>
                      <div className="flex-1 border bg-background overflow-auto p-6">
                        {testResult && testResult.node && (
                          <div className="space-y-6 pt-6">
                            
                            {/* React Flow-style Node using Shadcn Card */}
                            <div className="relative mx-auto w-[320px] mb-12">
                              {/* Node Container */}
                              <Card className="border shadow-sm hover:shadow-md transition-transform duration-200 overflow-hidden">
                                {/* Node Header */}
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-center">
                                    {testResult.node.data.title || 'Node'}
                                  </CardTitle>
                                  <CardDescription className="text-center text-xs max-w-[90%] mx-auto">
                                    {testResult.node.data.description}
                                  </CardDescription>
                                </CardHeader>
                                
                                {/* Node Body - Handles Section */}
                                <CardContent className="p-4 pt-2">
                                  <div className="relative">
                                    {/* Handles Container */}
                                    <div className={`flex justify-between items-start ${Math.max(testResult.node.data.inputs.length, testResult.node.data.outputs.length) > 3 ? 'min-h-[120px]' : 'min-h-[80px]'}`}>
                                      
                                      {/* Input Handles */}
                                      <div className="flex flex-col gap-3 items-start">
                                        {testResult.node.data.inputs.map((input: NodeIO, index: number) => (
                                          <div key={input.id} className="flex items-center gap-2 group relative">
                                            <div className="w-4 h-4 rounded-full bg-red-500 group-hover:scale-110 transition-transform border-2 border-background relative">
                                              <div className="absolute -left-16 -top-1 invisible group-hover:visible bg-popover border text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none">
                                                {input.type}
                                              </div>
                                            </div>
                                            <span className="text-xs font-medium">{input.name}</span>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Output Handles */}
                                      <div className="flex flex-col gap-3 items-end">
                                        {testResult.node.data.outputs.map((output: NodeIO, index: number) => (
                                          <div key={output.id} className="flex items-center gap-2 group relative">
                                            <span className="text-xs font-medium">{output.name}</span>
                                            <div className="w-4 h-4 rounded-full bg-blue-500 group-hover:scale-110 transition-transform border-2 border-background relative">
                                              <div className="absolute -right-16 -top-1 invisible group-hover:visible bg-popover border text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none">
                                                {output.type}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Node Details */}
                            <Card className="mt-9 border-none bg-transparent shadow-none">
                              <Separator/> 
                              <CardContent className="border-none p-0 pt-4">
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-sm flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                      Inputs
                                    </h5>
                                    <ul className="space-y-1.5">
                                      {testResult.node.data.inputs.map((input: NodeIO) => (
                                        <li key={input.id} className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono bg-background">{input.name}</Badge>
                                          <span className="text-xs text-muted-foreground">({input.type})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-sm flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                      Outputs
                                    </h5>
                                    <ul className="space-y-1.5">
                                      {testResult.node.data.outputs.map((output: NodeIO) => (
                                        <li key={output.id} className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono bg-background">{output.name}</Badge>
                                          <span className="text-xs text-muted-foreground">({output.type})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <div className="mt-4 pt-3 border-t">
                                  <h5 className="font-medium text-sm mb-2">Function:</h5>
                                  <div className="bg-background border p-2 rounded-md text-sm font-mono flex items-center justify-between">
                                    <span>{testResult.node.data.function_name}</span>
                                    <Badge variant="secondary">
                                      {testResult.node.data.language}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        {testError && (
                          <Alert variant="destructive">
                            <AlertDescription>{testError}</AlertDescription>
                          </Alert>
                        )}
                        {!testResult && !testError && (
                          <div className="text-muted-foreground text-sm flex items-center justify-center h-full">
                            Click "Test Node" to analyze your code
                          </div>
                        )}
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t">
          <DialogClose asChild>
            <button 
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm font-medium"
              onClick={resetNode}
            >
              Cancel
            </button>
          </DialogClose>
          <Button 
            className="ml-2" 
            onClick={handleSaveNode} 
            disabled={isSaving || !!saveError || !nodeName}
            variant={saveSuccess ? "secondary" : "default"}
          >
            <div className="flex items-center gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? (saveSuccess ? 'Updated!' : 'Update Node') : (saveSuccess ? 'Saved!' : 'Save Node')}</span>
              )}
            </div>
          </Button>
        </DialogFooter>
      </LargeDialogContent>
    </Dialog>
  )
}

export default CustomNode
