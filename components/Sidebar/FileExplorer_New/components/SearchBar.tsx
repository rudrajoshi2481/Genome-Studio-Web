/**
 * Search Bar Component
 * Advanced search functionality with filters and real-time search
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  File, 
  Folder 
} from 'lucide-react';
import { SearchFilters } from '../types';

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  isSearching: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isSearching,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    file_types: [],
    include_content: false,
    case_sensitive: false,
    regex: false,
    max_results: 100
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Handle search input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearch(value, filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onSearch, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Re-search with new filters if there's a query
    if (query.trim()) {
      onSearch(query, updatedFilters);
    }
  }, [filters, query, onSearch]);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClear();
    } else if (event.key === 'Enter') {
      onSearch(query, filters);
    }
  }, [query, filters, onSearch, handleClear]);

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  return (
    <div className={`relative ${className}`}>
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search files..."
          className="w-full pl-10 pr-20 py-2 text-sm border-0 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Clear button */}
          {query && (
            <button
              onClick={handleClear}
              className="p-1 mr-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 mr-2 rounded ${
              showFilters || Object.values(filters).some(v => 
                Array.isArray(v) ? v.length > 0 : v === true
              ) 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400'
            }`}
            title="Search filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters dropdown */}
      {showFilters && (
        <div 
          ref={filtersRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        >
          <div className="p-4 space-y-4">
            {/* File types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['files', 'directories'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const newTypes = filters.file_types?.includes(type)
                        ? filters.file_types.filter(t => t !== type)
                        : [...(filters.file_types || []), type];
                      handleFilterChange({ file_types: newTypes });
                    }}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      filters.file_types?.includes(type)
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type === 'files' ? (
                      <File className="h-4 w-4 mr-2" />
                    ) : (
                      <Folder className="h-4 w-4 mr-2" />
                    )}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* File extensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Common Extensions
              </label>
              <div className="flex flex-wrap gap-1">
                {['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json', '.md', '.txt'].map((ext) => (
                  <button
                    key={ext}
                    onClick={() => {
                      const newTypes = filters.file_types?.includes(ext)
                        ? filters.file_types.filter(t => t !== ext)
                        : [...(filters.file_types || []), ext];
                      handleFilterChange({ file_types: newTypes });
                    }}
                    className={`px-2 py-1 text-xs rounded border ${
                      filters.file_types?.includes(ext)
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {ext}
                  </button>
                ))}
              </div>
            </div>

            {/* Search options */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.include_content || false}
                  onChange={(e) => handleFilterChange({ include_content: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Search file contents
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.case_sensitive || false}
                  onChange={(e) => handleFilterChange({ case_sensitive: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Case sensitive
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.regex || false}
                  onChange={(e) => handleFilterChange({ regex: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Regular expressions
                </span>
              </label>
            </div>

            {/* Max results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Results: {filters.max_results}
              </label>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={filters.max_results || 100}
                onChange={(e) => handleFilterChange({ max_results: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>1000</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  const resetFilters: SearchFilters = {
                    file_types: [],
                    include_content: false,
                    case_sensitive: false,
                    regex: false,
                    max_results: 100
                  };
                  setFilters(resetFilters);
                  if (query.trim()) {
                    onSearch(query, resetFilters);
                  }
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Reset Filters
              </button>
              
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
