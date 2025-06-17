import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DataProcessingPipeline } from '@/lib/types/pipeline-flow';

export async function POST(request: NextRequest) {
  try {
    const { pipeline, filePath } = await request.json();
    
    // Ensure the pipeline is valid
    if (!pipeline || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields: pipeline or filePath' },
        { status: 400 }
      );
    }
    
    // Resolve the file path (ensure it's within the public directory for security)
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!resolvedPath.startsWith(path.resolve(process.cwd(), 'public'))) {
      return NextResponse.json(
        { error: 'Invalid file path. Must be within the public directory.' },
        { status: 403 }
      );
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the pipeline data to the file
    fs.writeFileSync(resolvedPath, JSON.stringify(pipeline, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to save pipeline' },
      { status: 500 }
    );
  }
}
