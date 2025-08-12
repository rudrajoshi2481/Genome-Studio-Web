import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Search, Download, Filter } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { toast } from 'sonner'

interface DataTableViewerProps {
  tabId: string
  filePath: string
}

interface TableData {
  headers: string[]
  rows: string[][]
  totalRows: number
}

/**
 * DataTableViewer component for displaying CSV/TSV files with search and pagination
 * Uses the new file-explorer-new API for data loading
 */
const DataTableViewer: React.FC<DataTableViewerProps> = ({ tabId, filePath }) => {
  const [data, setData] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(50)

  // Determine file type
  const fileType = useMemo(() => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    return ext === 'tsv' ? 'tsv' : 'csv'
  }, [filePath])

  // Parse CSV/TSV content
  const parseTableData = useCallback((content: string): TableData => {
    const delimiter = fileType === 'tsv' ? '\t' : ','
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return { headers: [], rows: [], totalRows: 0 }
    }

    // Parse headers
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
    
    // Parse rows
    const rows = lines.slice(1).map(line => {
      return line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''))
    })

    return {
      headers,
      rows,
      totalRows: rows.length
    }
  }, [fileType])

  // Load table data
  const loadTableData = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoading(true)
      setError(null)
      
      console.log('📊 DataTableViewer: Loading table data for:', filePath)
      
      const fileContent = await editorAPI.getFileContent(filePath)
      const tableData = parseTableData(fileContent.content)
      
      setData(tableData)
      console.log('✅ DataTableViewer: Table data loaded successfully')
    } catch (error) {
      console.error('❌ DataTableViewer: Error loading table data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load table data')
    } finally {
      setIsLoading(false)
    }
  }, [filePath, parseTableData])

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data

    const filteredRows = data.rows.filter(row =>
      row.some(cell => 
        cell.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )

    return {
      ...data,
      rows: filteredRows,
      totalRows: filteredRows.length
    }
  }, [data, searchTerm])

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!filteredData) return null

    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedRows = filteredData.rows.slice(startIndex, endIndex)

    return {
      ...filteredData,
      rows: paginatedRows
    }
  }, [filteredData, currentPage, rowsPerPage])

  // Calculate pagination info
  const totalPages = Math.ceil((filteredData?.totalRows || 0) / rowsPerPage)

  // Download table data
  const downloadData = useCallback(async () => {
    try {
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() || 'data'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Data downloaded successfully')
    } catch (error) {
      console.error('❌ DataTableViewer: Error downloading data:', error)
      toast.error('Failed to download data')
    }
  }, [filePath])

  // Load data on mount
  useEffect(() => {
    loadTableData()
  }, [loadTableData])

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading table data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading table data</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadTableData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.headers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-center">
          <p>No data to display</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredData?.totalRows || 0} rows
            {searchTerm && ` (filtered from ${data.totalRows})`}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={downloadData}
            className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left border-b border-gray-300 font-semibold text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData?.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 border-b border-gray-200 text-sm"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTableViewer
