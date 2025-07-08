import { useState, useEffect } from 'react';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import path from 'path';
import { useFileContentStore } from '@/lib/stores/file-content-store';

// Common image signatures for validation
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const jpegSignature = [0xff, 0xd8, 0xff];

// Helper function to convert Uint8Array to base64 string
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useImageViewer(tabId: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { getTab } = useTabStore();
  const fileContentStore = useFileContentStore();

  useEffect(() => {
    const loadImage = async () => {
      if (!tabId) return;

      try {
        setIsLoading(true);
        setError(null);

        const tab = getTab(tabId);
        if (!tab) throw new Error('Tab not found');

        const rootPath = path.dirname(tab.path);
        console.log('[IMAGE VIEWER] Loading image:', tab.path);

        const fileContent = await fileContentStore.getFileContent(tab.path, rootPath);
        console.log('[IMAGE VIEWER] File content received');

        let bytes: Uint8Array;
        const encoding = fileContent.metadata?.encoding || 'binary';
        
        // Check if content is base64 encoded from backend
        if (encoding === 'base64' && typeof fileContent.content === 'string') {
          console.log('[IMAGE VIEWER] Handling base64 encoded content');
          try {
            // Log a sample of the base64 string for debugging
            console.log('[IMAGE VIEWER] Base64 sample (first 50 chars):', 
              fileContent.content.substring(0, 50) + '...');
            
            // Decode base64 string to binary
            const binaryString = atob(fileContent.content);
            console.log('[IMAGE VIEWER] Binary string length after decode:', binaryString.length);
            
            // Create Uint8Array from binary string
            bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Log the first few bytes to verify content
            console.log('[IMAGE VIEWER] First 16 bytes:', 
              Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
          } catch (e: unknown) {
            console.error('[IMAGE VIEWER] Failed to decode base64:', e);
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            throw new Error(`Invalid base64 encoding: ${errorMessage}`);
          }
        } else if (typeof fileContent.content === 'string') {
          // Fallback: treat as binary string (UTF-16 encoded binary data)
          console.log('[IMAGE VIEWER] Handling binary string content');
          const str = fileContent.content;
          
          // Log string length and sample for debugging
          console.log('[IMAGE VIEWER] Binary string length:', str.length);
          console.log('[IMAGE VIEWER] First 20 chars sample:', str.substring(0, 20));
          
          // Log first 20 bytes in hex for debugging
          console.log('[IMAGE VIEWER] First 20 bytes in hex:', 
            str.slice(0, 20).split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '));
          
          // Check for Unicode replacement characters which indicate corruption
          const replacementCharCount = str.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length;
          if (replacementCharCount > 0) {
            console.warn(`[IMAGE VIEWER] Warning: Found ${replacementCharCount} Unicode replacement characters, indicating possible binary corruption`);
          }
          
          // Convert string to bytes
          bytes = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i) & 0xff;
          }
          
          // Log the first few bytes after conversion
          console.log('[IMAGE VIEWER] First 16 bytes after conversion:', 
            Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        } else {
          console.error('[IMAGE VIEWER] Unsupported content format');
          throw new Error('Unsupported content format');
        }

        // Determine MIME type from file extension
        const extension = path.extname(tab.path).toLowerCase();
        let mimeType = 'image/png';
        if (extension === '.jpg' || extension === '.jpeg') mimeType = 'image/jpeg';
        else if (extension === '.gif') mimeType = 'image/gif';
        else if (extension === '.svg') mimeType = 'image/svg+xml';
        else if (extension === '.webp') mimeType = 'image/webp';
        else if (extension === '.tiff' || extension === '.tif') mimeType = 'image/tiff';

        // Validate image signature if it's PNG or JPEG
        if (extension === '.png') {
          const isValidPng = bytes.length >= 8 && 
            pngSignature.every((byte, index) => bytes[index] === byte);
          if (!isValidPng) {
            console.warn('[IMAGE VIEWER] Warning: Invalid PNG signature detected');
          }
        } else if (extension === '.jpg' || extension === '.jpeg') {
          const isValidJpeg = bytes.length >= 3 && 
            jpegSignature.every((byte, index) => bytes[index] === byte);
          if (!isValidJpeg) {
            console.warn('[IMAGE VIEWER] Warning: Invalid JPEG signature detected');
          }
        }

        // Verify we have valid bytes before creating blob
        if (bytes.length === 0) {
          console.error('[IMAGE VIEWER] Error: Empty byte array');
          throw new Error('Image data is empty');
        }
        
        // Create data URL directly from bytes
        try {
          console.log(`[IMAGE VIEWER] Creating data URL with ${bytes.length} bytes and MIME type: ${mimeType}`);
          
          // Convert bytes to base64 string
          const base64Data = arrayBufferToBase64(bytes);
          
          // Create data URL
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          console.log('[IMAGE VIEWER] Data URL created (first 50 chars):', dataUrl.substring(0, 50) + '...');
          
          // Set image source
          setImageSrc(dataUrl);
        } catch (e: unknown) {
          console.error('[IMAGE VIEWER] Error creating data URL:', e);
          const errorMessage = e instanceof Error ? e.message : 'Unknown data URL creation error';
          throw new Error(`Failed to create image data URL: ${errorMessage}`);
        }

        console.log('[IMAGE VIEWER] Image loaded successfully');
      } catch (err) {
        console.error('[IMAGE VIEWER] ERROR loading image:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [tabId, getTab, fileContentStore]);

  useEffect(() => {
    return () => {
      console.log('[IMAGE VIEWER] Component unmounting, no URL revocation needed for data URLs');
    };
  }, []);


  console.log('[IMAGE VIEWER] Image source: #########', imageSrc);

  return {
    imageSrc,
    isLoading,
    error
  };
}
