# File Explorer with Drag and Drop Upload

This component provides a file explorer interface with drag and drop upload functionality for files and folders of any size.

## Features

- Browse files and folders in a tree structure
- Create, rename, and delete files and folders
- Drag and drop upload for files and folders
- Support for large file uploads (multi-terabyte)
- Progress tracking for uploads
- Configurable API endpoints for different environments

## Configuration

The file upload functionality can be configured in the `config.ts` file:

```typescript
export const FileExplorerConfig = {
  // API base URL for file operations
  API_BASE_URL: '',
  
  // Maximum file size for standard uploads (in bytes)
  MAX_STANDARD_FILE_SIZE: 50 * 1024 * 1024,
  
  // Chunk size for large file uploads (in bytes)
  CHUNK_SIZE: 1 * 1024 * 1024,
  
  // Whether to automatically overwrite existing files
  AUTO_OVERWRITE: true,
  
  // Timeout for API requests (in milliseconds)
  REQUEST_TIMEOUT: 30000,
};
```

### Using with Docker

When running the application in Docker and accessing it from a different machine, you need to set the `API_BASE_URL` to the actual server address:

1. Open `config.ts`
2. Set `API_BASE_URL` to your server's address, for example:
   ```typescript
   API_BASE_URL: 'http://your-server-ip:8000',
   ```
3. This ensures that file uploads work correctly when accessing the application from outside the Docker container.

## Components

- `FileExplorer.tsx`: Main component that renders the file tree and handles user interactions
- `DragDropUtils.ts`: Utility functions for handling drag and drop file uploads
- `UploadProgress.tsx`: Component for displaying upload progress
- `config.ts`: Configuration options for the file explorer

## API Endpoints

The component uses the following API endpoints:

- `/api/v1/large-files/upload`: For uploading files
- `/api/v1/file-explorer/create-directory`: For creating directories

These endpoints are provided by the backend server in `large_file_router.py` and `fileexplorer_router.py`.
