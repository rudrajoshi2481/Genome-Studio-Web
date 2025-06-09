import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from '@/lib/utils/api-config';

/**
 * GET handler for retrieving user information
 */
export async function GET(request: NextRequest) {
  // Get the authorization header from the request
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    console.log('Proxying request to:', endpoints.auth.user);
    // Forward the request to the backend API
    const response = await fetch(endpoints.auth.user, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for updating user information
 * This proxies the request to the backend API
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header and body from the request
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    // Forward the request to the backend API
    const response = await fetch(endpoints.auth.user, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}
