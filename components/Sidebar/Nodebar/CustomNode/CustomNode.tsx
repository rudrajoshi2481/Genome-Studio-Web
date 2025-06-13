"use client"
import React, { useState } from 'react'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { PlayIcon, XIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNodeStore } from './nodeStore'
import TagInput from './TagInput'
import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import CodeEditor from '@/components/EditorWindow/CodeEditor/CodeEditor'
import { Separator } from '@/components/ui/separator'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

function CustomNode() {
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
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)
  
  // Function to test the node code
  const handleTestCode = async () => {
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    
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
      const response = await fetch('http://localhost:8000/api/v1/workflow-manager/execute/function/convert-to-node', {
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
      
      if (data.status === 'success') {
        setTestResult(data)
      } else {
        setTestError(data.message || 'Error analyzing node code')
      }
    } catch (error) {
      console.error('Error testing node:', error)
      setTestError('Failed to connect to the API. Make sure the server is running.')
    } finally {
      setTestLoading(false)
    }
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="m-5">
          Create Custom Node
        </Button>
      </DialogTrigger>
      
      <LargeDialogContent>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Node Configuration</DialogTitle>
          <DialogDescription className="text-sm mt-1">
            Configure your node properties and connections here.
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
                        <CodeEditor 
                          content={code} 
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
                            
                            {/* React Flow-style Node using Shadcn Card - FIXED VERSION */}
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
                                      
                                    {/* Input Handles - FIXED */}
<div className="flex flex-col gap-3 items-start">
  {testResult.node.data.inputs.map((input: any, index: number) => (
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

{/* Output Handles - FIXED */}
<div className="flex flex-col gap-3 items-end">
  {testResult.node.data.outputs.map((output: any, index: number) => (
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
                                      {testResult.node.data.inputs.map((input: any) => (
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
                                      {testResult.node.data.outputs.map((output: any) => (
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
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium ml-2">Save Changes</button>
        </DialogFooter>
      </LargeDialogContent>
    </Dialog>
  )
}

export default CustomNode
