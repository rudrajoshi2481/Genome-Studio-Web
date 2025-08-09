import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface FileUploadInfo {
  fileName: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  startTime: number;
}

interface UploadProgressProps {
  isUploading: boolean;
  progress: number;
  fileName: string;
  onCancel: () => void;
  bytesUploaded?: number;
  totalBytes?: number;
  filesCompleted?: number;
  totalFiles?: number;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  isUploading,
  progress,
  fileName,
  onCancel,
  bytesUploaded = 0,
  totalBytes = 0,
  filesCompleted = 0,
  totalFiles = 1
}) => {
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [lastBytes, setLastBytes] = useState<number>(0);
  const [lastTime, setLastTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const speedSamples = useRef<number[]>([]);
  const startTime = useRef<number>(Date.now());
  
  // Keep track of recent files for expanded view
  const [recentFiles, setRecentFiles] = useState<FileUploadInfo[]>([]);
  const prevFileName = useRef<string>('');
  
  // When a new file starts uploading, add it to recent files
  useEffect(() => {
    if (fileName && fileName !== prevFileName.current && isUploading) {
      prevFileName.current = fileName;
      
      // Add new file to the list
      setRecentFiles(prev => {
        // Keep only the last 5 files
        const newFiles = [...prev];
        if (newFiles.length >= 5) {
          newFiles.shift();
        }
        
        newFiles.push({
          fileName,
          progress: 0,
          bytesUploaded: 0,
          totalBytes: totalBytes || 0,
          startTime: Date.now()
        });
        
        return newFiles;
      });
    }
  }, [fileName, isUploading, totalBytes]);
  
  // Update the progress of the current file
  useEffect(() => {
    if (fileName && isUploading) {
      setRecentFiles(prev => {
        const newFiles = [...prev];
        const currentFileIndex = newFiles.findIndex(f => f.fileName === fileName);
        
        if (currentFileIndex !== -1) {
          newFiles[currentFileIndex] = {
            ...newFiles[currentFileIndex],
            progress,
            bytesUploaded
          };
        }
        
        return newFiles;
      });
    }
  }, [fileName, progress, bytesUploaded, isUploading]);
  
  // Calculate upload speed and time remaining
  useEffect(() => {
    if (isUploading && bytesUploaded > 0) {
      const now = Date.now();
      const timeDiff = now - lastTime;
      
      // Only update speed calculation every 300ms
      if (timeDiff > 300) {
        const bytesDiff = bytesUploaded - lastBytes;
        const speedMBps = (bytesDiff / timeDiff) * 1000 / (1024 * 1024);
        
        // Add to speed samples for smoothing
        speedSamples.current.push(speedMBps);
        if (speedSamples.current.length > 5) {
          speedSamples.current.shift();
        }
        
        // Calculate average speed from samples
        const avgSpeed = speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length;
        setUploadSpeed(avgSpeed);
        
        // Calculate time remaining
        if (avgSpeed > 0 && totalBytes > bytesUploaded) {
          const bytesRemaining = totalBytes - bytesUploaded;
          const secondsRemaining = bytesRemaining / (avgSpeed * 1024 * 1024);
          setTimeRemaining(secondsRemaining);
        }
        
        setLastBytes(bytesUploaded);
        setLastTime(now);
      }
    } else if (!isUploading) {
      setUploadSpeed(0);
      setLastBytes(0);
      setTimeRemaining(null);
      speedSamples.current = [];
    }
  }, [isUploading, bytesUploaded, lastBytes, lastTime, totalBytes]);
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return 'calculating...';
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  // Calculate elapsed time
  const elapsedSeconds = (Date.now() - startTime.current) / 1000;
  const elapsedTime = formatTimeRemaining(elapsedSeconds);
  
  if (!isUploading) return null;

  return (
    <div className="fixed bottom-4 left-20 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-96 z-50">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="text-sm font-medium">
            Uploading: {filesCompleted}/{totalFiles} files
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Current file */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate" title={fileName}>
        Current: {fileName}
      </div>
      
      <Progress value={progress} className="h-2 mb-2" />
      
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <div>
          {formatBytes(bytesUploaded)} / {formatBytes(totalBytes || 0)}
        </div>
        <div>
          {progress.toFixed(1)}% • {uploadSpeed.toFixed(1)} MB/s
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <div>Elapsed: {elapsedTime}</div>
        <div>
          {timeRemaining !== null ? `Remaining: ~${formatTimeRemaining(timeRemaining)}` : 'Calculating...'}
        </div>
      </div>
      
      {/* Expanded view with recent files */}
      {expanded && recentFiles.length > 0 && (
        <div className="mt-3 border-t pt-2 border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium mb-1">Recent files:</div>
          {recentFiles.map((file, index) => (
            <div key={index} className="mb-2 last:mb-0">
              <div className="flex justify-between text-xs">
                <div className="truncate max-w-[200px]" title={file.fileName}>{file.fileName}</div>
                <div>{file.progress.toFixed(0)}%</div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full" 
                  style={{ width: `${file.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
