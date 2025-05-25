import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, AlertCircle } from 'lucide-react';
import { useFileExplorerStore } from '../store';

interface PathInputProps {
  currentPath: string;
  isVisible: boolean;
  onSubmit: (path: string) => void;
  onCancel: () => void;
}

export const PathInput: React.FC<PathInputProps> = ({
  currentPath,
  isVisible,
  onSubmit,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState(currentPath || '/app');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidPath, setIsValidPath] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Reset input value when current path changes
  useEffect(() => {
    setInputValue(currentPath || '/app');
  }, [currentPath]);

  // Focus input when it becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);
  
  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);
  
  // Scroll selected item into view when using keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch directory suggestions as user types
  const fetchSuggestions = async (path: string) => {
    try {
      setIsLoading(true);
      
      // Don't try to fetch suggestions for empty paths
      if (!path || path.trim() === '') {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        return;
      }
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      const { config } = await import('@/lib/config');
      
      // Determine if we're filtering by a partial folder name
      let searchPath = path;
      let filterTerm = '';
      
      if (path.endsWith('/')) {
        // If path ends with /, we're just looking at that directory
        searchPath = path;
      } else if (path.includes('/')) {
        // Extract the directory part and the filter term
        const lastSlashIndex = path.lastIndexOf('/');
        searchPath = path.substring(0, lastSlashIndex + 1);
        filterTerm = path.substring(lastSlashIndex + 1).toLowerCase();
      }
      
      console.log('Fetching suggestions for path:', searchPath, 'with filter:', filterTerm);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        // First try to get the directory contents using the files endpoint
        // This endpoint returns a more complete directory structure
        const data = await apiRequest(
          `${config.apiUrl}/api/files?path=${searchPath}&depth=1`,
          { 
            headers: { accept: 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (data && data.children) {
          // Filter for directories only
          let dirSuggestions = data.children
            .filter((child: any) => child.type === 'directory')
            .map((child: any) => child.path);
          
          // Apply filter term if provided
          if (filterTerm) {
            dirSuggestions = dirSuggestions.filter((path: string) => {
              // Extract the folder name from the path
              const folderName = path.split('/').pop() || '';
              return folderName.toLowerCase().includes(filterTerm);
            });
          }
          
          console.log('Found directory suggestions:', dirSuggestions);
          setSuggestions(dirSuggestions);
          setIsValidPath(true);
          setShowSuggestions(dirSuggestions.length > 0);
        } else {
          console.log('No directory suggestions found in response');
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        const fetchError = error as Error;
        if (fetchError.name === 'AbortError') {
          console.warn('Suggestion fetch request timed out');
        } else {
          console.error('Error fetching directory suggestions:', fetchError);
          
          // Try fallback to directory/contents endpoint
          try {
            const fallbackData = await apiRequest(
              `${config.apiUrl}/api/directory/contents?path=${searchPath}`,
              { 
                headers: { accept: 'application/json' },
                credentials: 'include',
                cache: 'no-store'
              }
            );
            
            if (fallbackData && fallbackData.children) {
              // Filter for directories only
              let dirSuggestions = fallbackData.children
                .filter((child: any) => child.type === 'directory')
                .map((child: any) => child.path);
              
              // Apply filter term if provided
              if (filterTerm) {
                dirSuggestions = dirSuggestions.filter((path: string) => {
                  // Extract the folder name from the path
                  const folderName = path.split('/').pop() || '';
                  return folderName.toLowerCase().includes(filterTerm);
                });
              }
              
              console.log('Found directory suggestions from fallback:', dirSuggestions);
              setSuggestions(dirSuggestions);
              setIsValidPath(true);
              setShowSuggestions(dirSuggestions.length > 0);
              return;
            }
          } catch (fallbackError) {
            console.error('Fallback suggestion fetch also failed:', fallbackError);
          }
        }
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error in fetchSuggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only handle keyboard navigation when suggestions are shown
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); // Prevent cursor movement
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault(); // Prevent cursor movement
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'Enter':
        // If an item is selected, use that instead of the input value
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault(); // Prevent form submission
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Reset selected index when input changes
    setSelectedIndex(-1);
    
    // Debounce suggestion fetching
    const debounceTimer = setTimeout(() => {
      if (value.trim()) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim()) {
      try {
        // Show loading state while verifying
        setIsLoading(true);
        
        // Verify path exists before submitting
        const exists = await verifyPathExists(inputValue);
        
        if (exists) {
          console.log('Path is valid, submitting:', inputValue);
          onSubmit(inputValue);
          setShowSuggestions(false);
          setIsValidPath(true);
        } else {
          console.log('Path is invalid:', inputValue);
          setIsValidPath(false);
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        setIsValidPath(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onSubmit(suggestion);
    setShowSuggestions(false);
  };

  // Verify if a path exists
  const verifyPathExists = async (path: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Verifying path exists:', path);
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      const { config } = await import('@/lib/config');
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        // First try the files endpoint which is more reliable
        const data = await apiRequest(
          `${config.apiUrl}/api/files?path=${path}&depth=1`,
          { 
            headers: { accept: 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        // If we get a valid response with a type of 'directory', the path exists
        const exists = data && data.type === 'directory';
        console.log('Path verification result:', exists);
        return exists;
      } catch (error) {
        clearTimeout(timeoutId);
        const fetchError = error as Error;
        if (fetchError.name === 'AbortError') {
          console.warn('Path verification request timed out');
        } else {
          console.error('Error verifying path with files endpoint:', fetchError);
          
          // Try fallback to directory/contents endpoint
          try {
            console.log('Trying fallback verification with directory/contents endpoint');
            const fallbackData = await apiRequest(
              `${config.apiUrl}/api/directory/contents?path=${path}`,
              { 
                headers: { accept: 'application/json' },
                credentials: 'include',
                cache: 'no-store'
              }
            );
            
            // If we get a valid response with children, the path exists
            const exists = fallbackData && fallbackData.children;
            console.log('Fallback path verification result:', exists);
            return !!exists;
          } catch (fallbackError) {
            console.error('Fallback path verification also failed:', fallbackError);
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error in verifyPathExists:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex-1">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className={`w-full px-2 py-0.5 text-xs border rounded ${!isValidPath ? 'border-red-500' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && fetchSuggestions(inputValue)}
            onBlur={(e) => {
              // Only hide if not clicking on suggestions
              if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
                setTimeout(() => {
                  if (!suggestionsRef.current?.contains(document.activeElement)) {
                    onCancel();
                  }
                }, 100);
              }
            }}
            placeholder="/path/to/directory"
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        {!isValidPath && (
          <div className="absolute mt-1 w-full bg-red-50 text-red-500 text-xs p-1 rounded border border-red-200 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            No folder found at this path
          </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute mt-1 w-full bg-white shadow-lg rounded border border-gray-200 max-h-40 overflow-y-auto z-10"
          >
            {suggestions.map((suggestion, index) => {
              // Extract just the relative part of the path for display
              const searchPath = inputValue.includes('/') ? 
                inputValue.substring(0, inputValue.lastIndexOf('/') + 1) : 
                '/';
              
              // Get the relative part of the suggestion
              let displayPath = suggestion;
              if (suggestion.startsWith(searchPath)) {
                // Show only the part after the search path
                displayPath = suggestion.substring(searchPath.length);
                // If it's empty, just show the directory name
                if (!displayPath) {
                  displayPath = suggestion.split('/').filter(Boolean).pop() || '/';
                }
              }
              
              // Determine if this item is selected via keyboard navigation
              const isSelected = index === selectedIndex;
              
              return (
                <div
                  key={index}
                  ref={isSelected ? selectedItemRef : null}
                  className={`px-2 py-1 text-xs cursor-pointer flex items-center ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  title={suggestion} // Show full path on hover
                  onMouseEnter={() => setSelectedIndex(index)} // Update selected index on hover
                >
                  <FolderOpen className={`w-3 h-3 mr-1 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
                  <span className="truncate">{displayPath}</span>
                </div>
              );
            })}
          </div>
        )}
      </form>
    </div>
  );
};
