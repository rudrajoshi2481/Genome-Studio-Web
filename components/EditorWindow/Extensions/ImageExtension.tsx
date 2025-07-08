import React, { useEffect, useState, useRef } from 'react'
import { useImageViewer } from './hooks/useImageViewer'


interface ImageExtensionProps {
  tabId: string;
}

function ImageExtension({ tabId }: ImageExtensionProps) {
  const {
    imageSrc,
    isLoading,
    error
  } = useImageViewer(tabId)
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{width: number, height: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Debug logging for component render
  useEffect(() => {
    console.log('[IMAGE EXTENSION] Rendering with imageSrc:', imageSrc ? 'blob URL present' : 'no image source');
    if (error) console.error('[IMAGE EXTENSION] Error state:', error);
  }, [imageSrc, error]);

  // Handle image load success
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('[IMAGE EXTENSION] Image loaded successfully in DOM');
    setDisplayError(null);
    
    // Get actual image dimensions
    const img = e.currentTarget;
    setDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Handle image load error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('[IMAGE EXTENSION] Image failed to load in DOM');
    setDisplayError('Failed to display image');
    
    // Additional debugging
    if (imageSrc) {
      console.log('[IMAGE EXTENSION] Image source type:', imageSrc.substring(0, 30));
      
      if (imageSrc.startsWith('data:')) {
        // For data URLs, we can't fetch them directly
        console.log('[IMAGE EXTENSION] This is a data URL - cannot fetch directly');
        console.log('[IMAGE EXTENSION] Data URL length:', imageSrc.length);
        
        // Check if the data URL appears to be valid
        const dataUrlParts = imageSrc.split(',');
        if (dataUrlParts.length === 2) {
          const header = dataUrlParts[0];
          const base64Data = dataUrlParts[1];
          console.log('[IMAGE EXTENSION] Data URL header:', header);
          console.log('[IMAGE EXTENSION] Base64 data length:', base64Data.length);
        } else {
          console.error('[IMAGE EXTENSION] Invalid data URL format');
        }
      } else if (imageSrc.startsWith('blob:')) {
        // For blob URLs, we can try to fetch them
        console.log('[IMAGE EXTENSION] Attempting to fetch blob URL directly to verify content');
        fetch(imageSrc)
          .then(response => {
            console.log('[IMAGE EXTENSION] Blob fetch status:', response.status);
            return response.blob();
          })
          .then(blob => {
            console.log('[IMAGE EXTENSION] Blob content type:', blob.type, 'size:', blob.size);
          })
          .catch(err => {
            console.error('[IMAGE EXTENSION] Blob fetch error:', err);
          });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">Loading image...</div>
      </div>
    )
  }

  if (error || displayError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-red-500">{error || displayError}</div>
      </div>
    )
  }

  // No need for duplicate logging
  
  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Image display container */}
      <div className="flex-1 overflow-auto p-4">
        {imageSrc ? (
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="Image preview" 
            className="max-w-full"
            style={{ 
              maxHeight: 'calc(100vh - 100px)'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="text-sm text-gray-500">No image source available</div>
        )}
      </div>
    </div>
  )
}

export default ImageExtension