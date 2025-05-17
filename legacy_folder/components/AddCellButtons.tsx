"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Code, FileText } from 'lucide-react'

interface AddCellButtonsProps {
  onAddCode: () => void
  onAddMarkdown: () => void
  className?: string
}

export const AddCellButtons: React.FC<AddCellButtonsProps> = ({
  onAddCode,
  onAddMarkdown,
  className = ''
}) => {
  return (
    <div className={`flex justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={onAddCode}
        className="h-8 text-xs bg-background/95 hover:bg-background"
      >
        <Code className="h-3 w-3 mr-1" />
        Code
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onAddMarkdown}
        className="h-8 text-xs bg-background/95 hover:bg-background"
      >
        <FileText className="h-3 w-3 mr-1" />
        Text
      </Button>
    </div>
  )
}
