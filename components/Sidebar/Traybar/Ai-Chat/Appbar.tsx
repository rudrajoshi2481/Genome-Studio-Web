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
    <div className='p-1 border-b flex justify-between items-center'>
        <div>
          <span className="font-semibold text-sm">Genome Studio AI</span>

          </div>

<div>
</div>
    </div>
  )
}

export default Appbar