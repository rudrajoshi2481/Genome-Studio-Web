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
  Folder,
  Loader2
} from 'lucide-react';
import { SearchFilters } from '../types';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v === true
  );

  return (
    <div className={cn("relative", className)}>
      {/* Modern Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search files and folders..."
          className="pl-10 pr-20 h-9 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {/* Clear button */}
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Filters popover */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 w-6 p-0",
                  hasActiveFilters 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-accent"
                )}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Search Filters</h4>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(filters).filter(v => 
                        Array.isArray(v) ? v.length > 0 : v === true
                      ).length} active
                    </Badge>
                  )}
                </div>

                
                <Separator />
                
                {/* File types */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">File Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {['files', 'directories'].map((type) => (
                      <Button
                        key={type}
                        variant={filters.file_types?.includes(type) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newTypes = filters.file_types?.includes(type)
                            ? filters.file_types.filter(t => t !== type)
                            : [...(filters.file_types || []), type];
                          handleFilterChange({ file_types: newTypes });
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        {type === 'files' ? (
                          <File className="h-3 w-3 mr-1" />
                        ) : (
                          <Folder className="h-3 w-3 mr-1" />
                        )}
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* File extensions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Common Extensions</Label>
                  <div className="flex flex-wrap gap-1">
                    {['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json', '.md', '.txt'].map((ext) => (
                      <Button
                        key={ext}
                        variant={filters.file_types?.includes(ext) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newTypes = filters.file_types?.includes(ext)
                            ? filters.file_types.filter(t => t !== ext)
                            : [...(filters.file_types || []), ext];
                          handleFilterChange({ file_types: newTypes });
                        }}
                        className="h-6 px-2 text-xs font-mono"
                      >
                        {ext}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Search options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Search Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-content"
                        checked={filters.include_content || false}
                        onCheckedChange={(checked) => handleFilterChange({ include_content: !!checked })}
                      />
                      <Label htmlFor="include-content" className="text-sm font-normal">
                        Search file contents
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="case-sensitive"
                        checked={filters.case_sensitive || false}
                        onCheckedChange={(checked) => handleFilterChange({ case_sensitive: !!checked })}
                      />
                      <Label htmlFor="case-sensitive" className="text-sm font-normal">
                        Case sensitive
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="regex"
                        checked={filters.regex || false}
                        onCheckedChange={(checked) => handleFilterChange({ regex: !!checked })}
                      />
                      <Label htmlFor="regex" className="text-sm font-normal">
                        Regular expressions
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Max results */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Max Results</Label>
                    <Badge variant="outline" className="text-xs">
                      {filters.max_results}
                    </Badge>
                  </div>
                  <Slider
                    value={[filters.max_results || 100]}
                    onValueChange={([value]) => handleFilterChange({ max_results: value })}
                    max={1000}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>1000</span>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                    className="flex-1"
                  >
                    Reset
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
