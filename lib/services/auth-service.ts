import { endpoints } from '../utils/api-config';
import { getServerConfig } from '@/config/server';

const config = getServerConfig();

/**
 * Authentication Service
 * 
 * Handles user authentication, token management, and user information
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  expiresIn?: number;
  user?: any;
}

/**
 * Login with username and password
 * @param username User's username
 * @param password User's password
 * @returns Authentication response with token and user info
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    // Create form data for login with OAuth2 password flow parameters
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', username);
    formData.append('password', password);
    formData.append('scope', '');
    formData.append('client_id', 'genome_studio_web');
    formData.append('client_secret', 'genome_studio_secret');
    
    // Make API request
    console.log('Attempting login to:', endpoints.auth.login);
    const response = await fetch(endpoints.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    // Parse response
    const data = await response.json();
    console.log('Login response:', data);
    
    if (!response.ok) {
      return {
        success: false,
        message: data.detail || 'Login failed',
      };
    }
    
    // Store token in cookies
    document.cookie = `${config.auth.tokenStorageKey}=${data.access_token}; path=/; max-age=${data.expires_in}; SameSite=Strict`;
    
    // Store expiry time
    const expiryTime = Date.now() + (data.expires_in * 1000);
    localStorage.setItem(config.auth.tokenExpiryKey, expiryTime.toString());
    
    // Get user info
    const user = await getCurrentUser(data.access_token);
    
    return {
      success: true,
      token: data.access_token,
      expiresIn: data.expires_in,
      user,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
}

/**
 * Logout the current user
 */
export function logout(): void {
  // Clear token from cookies
  document.cookie = `${config.auth.tokenStorageKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
  
  // Clear token expiry from local storage
  localStorage.removeItem(config.auth.tokenExpiryKey);
  
  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Get the current user's information
 * @param token Optional token to use for the request
 * @returns User information or null if not authenticated
 */
export async function getCurrentUser(token?: string): Promise<any> {
  try {
    // Get token from cookies if not provided
    if (!token) {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`));
      if (!tokenCookie) {
        console.log('No token found in cookies');
        return null;
      }
      token = tokenCookie.split('=')[1];
    }
    
    console.log('Fetching user profile from:', endpoints.auth.user);
    
    // Make API request
    const response = await fetch(endpoints.auth.user, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('User profile response status:', response.status);
    
    if (!response.ok) {
      console.error('Failed to get user profile:', response.status, response.statusText);
      return null;
    }
    
    const userData = await response.json();
    console.log('User profile data:', userData);
    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check if token exists in cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`));
  
  if (!tokenCookie) {
    return false;
  }
  
  // Check if token is expired
  const expiryTimeStr = localStorage.getItem(config.auth.tokenExpiryKey);
  if (!expiryTimeStr) {
    return false;
  }
  
  const expiryTime = parseInt(expiryTimeStr, 10);
  return Date.now() < expiryTime;
}

/**
 * Get the authentication token
 * @returns The authentication token or null if not authenticated
 */
export function getToken(): string | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check if token exists in cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`));
  
  if (!tokenCookie) {
    return null;
  }
  
  return tokenCookie.split('=')[1];
}

export default {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getToken,
};
