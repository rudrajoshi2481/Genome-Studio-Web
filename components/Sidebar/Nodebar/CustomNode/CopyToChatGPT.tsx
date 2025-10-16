"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CopyToChatGPTProps {
  code: string
  language: string
  nodeName?: string
  description?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function CopyToChatGPT({ 
  code, 
  language, 
  nodeName = 'Custom Node',
  description = '',
  variant = 'outline',
  size = 'default',
  className = ''
}: CopyToChatGPTProps) {
  
  const handleCopyToChatGPT = () => {
    // Create the prompt that will be sent to ChatGPT
    const prompt = `I need help fixing and optimizing this ${language} code for use in Genome Studio (a visual workflow editor using React Flow).

**Function Name:** ${nodeName}
${description ? `**Description:** ${description}` : ''}

**Current Code:**
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

**IMPORTANT - Genome Studio Code Format Requirements:**

The code MUST follow this specific format:

\`\`\`python
@node()  # Required decorator - marks this as the main entry point (NO IMPORT NEEDED)
def function_name(param1: str, param2: int):
    """
    Brief description of what this function does.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    """
    # Your code logic here
    print(f"Processing {param1}")  # Use print() for output, NOT logging
    result = f"Processed {param1} with {param2}"
    return result

# Capture the output - this becomes the output handle in React Flow
output_variable = function_name(param1: str, param2: int)
\`\`\`

**Critical Rules:**
1. **@node() decorator** - The main function MUST have @node() decorator (this marks it as the entry point)
   - **DO NOT import node or anything from genome_studio** - The decorator is built-in, no import needed
2. **Function parameters** - These become INPUT handles in the React Flow graph (e.g., param1, param2)
3. **Output variable** - Assign function result to a variable (e.g., output_variable = function_name(...))
   - This variable becomes the OUTPUT handle in React Flow
4. **DO NOT create/assign input variables** - Values are passed from connected nodes, not defined locally
5. **Type hints** - Use proper type hints for all parameters (str, int, float, list, dict, etc.)
6. **Docstring** - Include a clear docstring with description, Args, and Returns sections
7. **Multiple functions** - If you have helper functions, only the MAIN function needs @node()
8. **Use print() for output** - Use print() statements for logging/debugging, NOT logging module
9. **Only fix what's broken** - Do NOT add extra logic, imports, or features that weren't in the original code

**Please provide:**
1. Fixed code following the exact format above
2. A clear title for the node (short, descriptive name)
3. A brief description (1-2 sentences explaining what it does)
4. Review for bugs, optimizations, and best practices
5. Proper error handling if needed

Provide the corrected code in the Genome Studio format with title and description.`

    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt)
    
    // Open ChatGPT with the prompt
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`
    
    // Copy prompt to clipboard as backup
    navigator.clipboard.writeText(prompt).then(() => {
      toast.success('Prompt copied to clipboard!')
      
      // Open ChatGPT in new tab
      window.open(chatGPTUrl, '_blank', 'noopener,noreferrer')
      
      toast.info('Opening ChatGPT in new tab...')
    }).catch((err) => {
      console.error('Failed to copy to clipboard:', err)
      toast.error('Failed to copy prompt')
    })
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCopyToChatGPT}
            className={className}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Ask ChatGPT
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy code and open ChatGPT for optimization suggestions</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Alternative compact version with just icon
export function CopyToChatGPTIcon({ 
  code, 
  language, 
  nodeName = 'Custom Node',
  description = '',
  className = ''
}: CopyToChatGPTProps) {
  
  const handleCopyToChatGPT = () => {
    const prompt = `I need help fixing and optimizing this ${language} code for use in Genome Studio (a visual workflow editor using React Flow).

**Function Name:** ${nodeName}
${description ? `**Description:** ${description}` : ''}

**Current Code:**
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

**IMPORTANT - Genome Studio Code Format Requirements:**

The code MUST follow this specific format:

\`\`\`python
@node()  # Required decorator - marks this as the main entry point (NO IMPORT NEEDED)
def function_name(param1: str, param2: int):
    """
    Brief description of what this function does.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    """
    # Your code logic here
    print(f"Processing {param1}")  # Use print() for output, NOT logging
    result = f"Processed {param1} with {param2}"
    return result

# Capture the output - this becomes the output handle in React Flow
output_variable = function_name(param1: str, param2: int)
\`\`\`

**Critical Rules:**
1. **@node() decorator** - The main function MUST have @node() decorator (this marks it as the entry point)
   - **DO NOT import node or anything from genome_studio** - The decorator is built-in, no import needed
2. **Function parameters** - These become INPUT handles in the React Flow graph (e.g., param1, param2)
3. **Output variable** - Assign function result to a variable (e.g., output_variable = function_name(...))
   - This variable becomes the OUTPUT handle in React Flow
4. **DO NOT create/assign input variables** - Values are passed from connected nodes, not defined locally
5. **Type hints** - Use proper type hints for all parameters (str, int, float, list, dict, etc.)
6. **Docstring** - Include a clear docstring with description, Args, and Returns sections
7. **Multiple functions** - If you have helper functions, only the MAIN function needs @node()
8. **Use print() for output** - Use print() statements for logging/debugging, NOT logging module
9. **Only fix what's broken** - Do NOT add extra logic, imports, or features that weren't in the original code

**Please provide:**
1. Fixed code following the exact format above
2. A clear title for the node (short, descriptive name)
3. A brief description (1-2 sentences explaining what it does)
4. Review for bugs, optimizations, and best practices
5. Proper error handling if needed

Provide the corrected code in the Genome Studio format with title and description.`

    const encodedPrompt = encodeURIComponent(prompt)
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`
    
    navigator.clipboard.writeText(prompt).then(() => {
      toast.success('Prompt copied to clipboard!')
      window.open(chatGPTUrl, '_blank', 'noopener,noreferrer')
      toast.info('Opening ChatGPT in new tab...')
    }).catch((err) => {
      console.error('Failed to copy to clipboard:', err)
      toast.error('Failed to copy prompt')
    })
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyToChatGPT}
            className={className}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask ChatGPT to optimize this code</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
