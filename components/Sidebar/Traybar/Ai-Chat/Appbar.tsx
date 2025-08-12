import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
function Appbar() {
  return (
    <div className='p-2 border-b flex justify-between items-center'>
        <div>
          <span>Light Speed</span>

          </div>

<div>
  <Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="sm">
      <Plus />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Create New Conversation</p>
  </TooltipContent>
</Tooltip>
     
</div>
    </div>
  )
}

export default Appbar