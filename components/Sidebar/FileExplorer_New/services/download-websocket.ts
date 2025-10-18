/**
 * WebSocket-based folder download with progress updates
 */

import * as authService from '@/lib/services/auth-service';
import { host, port } from '@/config/server';

interface DownloadProgress {
  type: 'start' | 'progress' | 'complete' | 'data' | 'done' | 'error';
  files_processed?: number;
  current_file?: string;
  filename?: string;
  size?: number;
  data?: string;
  message?: string;
}

export class DownloadWebSocket {
  private ws: WebSocket | null = null;
  private chunks: Uint8Array[] = [];
  private onProgress?: (progress: DownloadProgress) => void;
  private onComplete?: (blob: Blob, filename: string) => void;
  private onError?: (error: string) => void;

  constructor(
    onProgress?: (progress: DownloadProgress) => void,
    onComplete?: (blob: Blob, filename: string) => void,
    onError?: (error: string) => void
  ) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  async downloadFolder(path: string): Promise<void> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    // Connect directly to backend, bypassing Next.js proxy
    // This avoids proxy timeout issues
    const wsUrl = `ws://${host}:${port}/api/v1/file-explorer-new/ws/download?token=${token}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.chunks = [];
      let filename = '';

      this.ws.onopen = () => {
        console.log('📡 WebSocket connected for download');
        // Send download request
        this.ws?.send(JSON.stringify({ path }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data: DownloadProgress = JSON.parse(event.data);

          switch (data.type) {
            case 'start':
              console.log('🚀 Download started');
              this.onProgress?.(data);
              break;

            case 'progress':
              console.log(`📦 Progress: ${data.files_processed} files`);
              this.onProgress?.(data);
              break;

            case 'complete':
              console.log(`✅ ZIP created: ${data.filename} (${data.files_processed} files)`);
              filename = data.filename || 'download.zip';
              this.onProgress?.(data);
              break;

            case 'data':
              // Receive and accumulate chunks
              if (data.data) {
                const binaryString = atob(data.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                this.chunks.push(bytes);
              }
              break;

            case 'done':
              console.log('✅ Download complete, creating blob');
              // Combine all chunks into a single blob
              const blob = new Blob(this.chunks, { type: 'application/zip' });
              this.onComplete?.(blob, filename);
              this.close();
              resolve();
              break;

            case 'error':
              console.error('❌ Download error:', data.message);
              this.onError?.(data.message || 'Download failed');
              this.close();
              reject(new Error(data.message || 'Download failed'));
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.onError?.('Failed to parse server response');
          this.close();
          reject(error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.('WebSocket connection error');
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('📡 WebSocket closed');
      };
    });
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.chunks = [];
  }
}
