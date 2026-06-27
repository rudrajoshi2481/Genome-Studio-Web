"use client";

import React from 'react';
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from '@/components/ai-elements/task';
import { FileIcon } from 'lucide-react';
import { Message } from './chatStore';

interface TaskMessageProps {
  message: Message;
}

function TaskMessage({ message }: TaskMessageProps) {
  const task = message.task;
  if (!task) return null;

  return (
    <div className="px-3 py-1">
      <Task>
        <TaskTrigger title={task.title} />
        <TaskContent className="mt-2">
          {task.items?.map((item, idx) => (
            <TaskItem key={idx} className="text-xs">
              <div className="space-y-0.5">
                <p className="text-xs">{item.label}</p>
                {item.files && item.files.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.files.map((file, fileIdx) => (
                      <TaskItemFile key={fileIdx} className="text-[10px] px-1 py-0">
                        <FileIcon className="size-2.5" />
                        {file}
                      </TaskItemFile>
                    ))}
                  </div>
                )}
              </div>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    </div>
  );
}

export default TaskMessage;
