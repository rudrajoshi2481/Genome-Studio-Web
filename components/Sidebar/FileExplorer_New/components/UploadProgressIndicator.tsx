"use client"

import React from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgressIndicatorProps {
  isUploading: boolean;
  currentFile: string | null;
  totalFiles: number;
  completedFiles: number;
  progress: number;
  speed: number;
  bytesUploaded: number;
  totalBytes: number;
  startTime: number | null;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  isUploading,
  currentFile,
  totalFiles,
  completedFiles,
  progress,
  speed,
  bytesUploaded,
  totalBytes,
  startTime,
}) => {
  if (!isUploading) return null;

  // Calculate time remaining
  const remainingBytes = totalBytes - bytesUploaded;
  const timeRemaining = speed > 0 && remainingBytes > 0 ? remainingBytes / speed : 0;

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format speed
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <div className="absolute -top-1 -right-1 flex items-center justify-center cursor-pointer z-10">
          <div className="relative">
            {/* Upload badge with progress ring */}
            <div className="relative w-6 h-6">
              {/* Pulsing background */}
              <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-30" />
              
              {/* Solid background */}
              <div className="absolute inset-0 bg-green-500 rounded-full shadow-lg border-2 border-background" />
              
              {/* Progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-white/20"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                  className="text-white transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Upload icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <CloudUpload className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent side="right" align="start" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              Uploading Files
            </h4>
            <span className="text-xs text-muted-foreground">
              {completedFiles}/{totalFiles}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}%</span>
              <span>{formatBytes(bytesUploaded)} / {formatBytes(totalBytes)}</span>
            </div>
          </div>

          {/* Current file */}
          {currentFile && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current file:</p>
              <p className="text-sm font-medium truncate" title={currentFile}>
                {currentFile}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="text-sm font-medium text-green-600">
                {formatSpeed(speed)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Time remaining</p>
              <p className="text-sm font-medium">
                {currentFile?.includes('Refreshing') 
                  ? 'Finishing...' 
                  : timeRemaining > 0 
                    ? formatTime(timeRemaining) 
                    : progress >= 100 
                      ? 'Almost done...' 
                      : 'Calculating...'}
              </p>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
