import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, Download, Save, AlertCircle, X, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { useEditorContext } from '../context/EditorContext'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import { FileType } from '../utils/fileTypeDetector'

interface CsvSpreadsheetProps {
  tabId: string
  filePath: string
}

interface CellCoords { row: number; col: number }

const SERIAL_COL = -1
const HEADER_ROW = 0
const MIN_COL_WIDTH = 48
const MIN_ROW_HEIGHT = 22
const BATCH_SIZE = 200
const TYPE_SAMPLE_LIMIT = 500

const parseDelimiter = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ext === 'tsv' ? '\t' : ','
}

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]
    if (inQuotes) {
      if (char === '"') {
        if (next === '"') { current += '"'; i++ } else { inQuotes = false }
      } else { current += char }
    } else {
      if (char === '"') { inQuotes = true }
      else if (char === delimiter) { result.push(current); current = '' }
      else { current += char }
    }
  }
  result.push(current)
  return result
}

const parseContent = (content: string, delimiter: string): string[][] => {
  const lines = content.split(/\r?\n/)
  const rows: string[][] = []
  for (const line of lines) {
    if (line === '' && rows.length > 0) { rows.push(['']); continue }
    rows.push(parseCsvLine(line, delimiter))
  }
  while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop()
  return rows
}

const serializeCell = (value: string, delimiter: string): string => {
  if (value === '') return ''
  const needsQuotes = value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')
  if (!needsQuotes) return value
  return '"' + value.replace(/"/g, '""') + '"'
}

const serializeRows = (rows: string[][], delimiter: string): string => rows.map(row => row.map(cell => serializeCell(cell, delimiter)).join(delimiter)).join('\n')

const isDate = (value: string): boolean => {
  if (!value) return false
  const v = value.trim()
  const isoDate = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/
  const isoSlash = /^\d{4}\/\d{2}\/\d{2}$/
  if (!(isoDate.test(v) || isoSlash.test(v))) return false
  return !isNaN(Date.parse(v))
}

const isBooleanish = (value: string): boolean => {
  const v = (value ?? '').trim().toLowerCase()
  if (!v) return false
  return ['true', 'false', 't', 'f', 'yes', 'no', 'y', 'n', 'on', 'off', '1', '0'].includes(v)
}

const estimateColumnType = (column: string[]): string => {
  let allBoolean = true, allDate = true, allInteger = true, allFloat = true, allEmpty = true
  for (const cell of column) {
    const items = cell.split(',').map(item => item.trim())
    for (const item of items) {
      if (item === '') continue
      allEmpty = false
      if (!isBooleanish(item)) allBoolean = false
      if (!isDate(item)) allDate = false
      const num = Number(item)
      if (!Number.isInteger(num)) allInteger = false
      if (isNaN(num)) allFloat = false
    }
  }
  if (allEmpty) return 'empty'
  if (allBoolean) return 'boolean'
  if (allDate) return 'date'
  if (allInteger) return 'integer'
  if (allFloat) return 'float'
  return 'string'
}

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  const r = Math.round(255 * f(0))
  const g = Math.round(255 * f(8))
  const b = Math.round(255 * f(4))
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

const getColumnColor = (type: string, isDark: boolean, columnIndex: number): string => {
  let hueRange = 0
  switch (type) {
    case 'boolean': hueRange = 30; break
    case 'date': hueRange = 210; break
    case 'float': hueRange = isDark ? 60 : 270; break
    case 'integer': hueRange = 120; break
    case 'string': hueRange = 0; break
    case 'empty': return isDark ? '#BBB' : '#444'
  }
  const sat = ((columnIndex * 7) % 31) - 15 + (isDark ? 60 : 80)
  const lig = ((columnIndex * 13) % 31) - 15 + (isDark ? 70 : 30)
  const hue = (hueRange + ((columnIndex * 17) % 31) - 15 + 360) % 360
  return hslToHex(hue, sat, lig)
}

const keyFor = (row: number, col: number) => `${row}:${col}`
const parseCoords = (k: string): CellCoords | null => {
  const [row, col] = k.split(':').map(Number)
  if (Number.isNaN(row) || Number.isNaN(col)) return null
  return { row, col }
}

const CsvSpreadsheet: React.FC<CsvSpreadsheetProps> = ({ tabId, filePath }) => {
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [hasHeader, setHasHeader] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(1)
  const [originalContent, setOriginalContent] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<CellCoords | null>(null)
  const [rangeEnd, setRangeEnd] = useState<CellCoords | null>(null)
  const [editingCell, setEditingCell] = useState<CellCoords | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'cell' | 'column' | 'row'>('cell')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; row: number; col: number; isHeader: boolean } | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findExpanded, setFindExpanded] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [findMatches, setFindMatches] = useState<CellCoords[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)

  const containerRef = useRef<HTMLDivElement>(null)
  const resizeState = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  const cellRefs = useRef<Record<string, HTMLTableCellElement | null>>({})
  const findInputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)
  const isMountedRef = useRef(true)

  const { registerEditor, unregisterEditor, setDirty, setSaved, getEditor, registerSaveCallback, unregisterSaveCallback } = useEditorContext()
  const { updateTab } = useTabStore()
  const editor = getEditor(tabId)

  const delimiter = useMemo(() => parseDelimiter(filePath), [filePath])
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const numColumns = useMemo(() => Math.max(1, rawRows.reduce((max, row) => Math.max(max, row.length), 0)), [rawRows])
  const headers = useMemo(() => hasHeader && rawRows.length > 0 ? rawRows[0] : Array.from({ length: numColumns }, (_, i) => `Col ${i + 1}`), [rawRows, hasHeader, numColumns])
  const dataRows = useMemo(() => hasHeader ? rawRows.slice(1) : rawRows, [rawRows, hasHeader])
  const dataStartRow = useCallback(() => hasHeader ? 1 : 0, [hasHeader])

  const columnTypes = useMemo(() => {
    const types: string[] = []
    const sample = dataRows.length > TYPE_SAMPLE_LIMIT ? dataRows.slice(0, TYPE_SAMPLE_LIMIT) : dataRows
    for (let c = 0; c < numColumns; c++) {
      const column = sample.map(row => row[c] || '')
      types.push(estimateColumnType(column))
    }
    return types
  }, [dataRows, numColumns])

  const columnColors = useMemo(() => columnTypes.map((type, i) => getColumnColor(type, isDark, i)), [columnTypes, isDark])

  const defaultColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    const sample = dataRows.length > TYPE_SAMPLE_LIMIT ? dataRows.slice(0, TYPE_SAMPLE_LIMIT) : dataRows
    const visible = hasHeader ? [headers, ...sample] : sample
    for (let c = 0; c < numColumns; c++) {
      let max = 8
      for (const row of visible) max = Math.max(max, (row[c] || '').length)
      widths[String(c)] = Math.min(max, 40) * 8 + 16
    }
    return widths
  }, [headers, dataRows, hasHeader, numColumns])

  const effectiveColumnWidths = useMemo(() => {
    const result: Record<string, number> = { ...defaultColumnWidths, ...columnWidths }
    for (const key of Object.keys(result)) result[key] = Math.max(result[key], MIN_COL_WIDTH)
    return result
  }, [defaultColumnWidths, columnWidths])

  const isDirty = useMemo(() => serializeRows(rawRows, delimiter) !== originalContent, [rawRows, delimiter, originalContent])

  useEffect(() => { registerEditor(tabId, filePath, FileType.DATA); return () => unregisterEditor(tabId) }, [tabId, filePath, registerEditor, unregisterEditor])
  useEffect(() => { if (editor && isDirty !== editor.isDirty) { setDirty(tabId, isDirty); updateTab(tabId, { isDirty }) } }, [isDirty, editor, setDirty, updateTab, tabId])

  const loadFile = useCallback(async () => {
    if (!filePath) return
    try {
      setIsLoading(true); setError(null)
      const fileContent = await editorAPI.getFileContent(filePath)
      if (!isMountedRef.current) return
      const content = fileContent.content || ''
      const parsed = parseContent(content, delimiter)
      if (!isMountedRef.current) return
      setRawRows(parsed)
      setHasHeader(parsed.length >= 2 && detectHeader(parsed))
      setOriginalContent(content)
      setVersion(fileContent.version || 1)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [filePath, delimiter])

  useEffect(() => { loadFile() }, [loadFile])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      setRawRows([])
      setOriginalContent('')
      setSelection(new Set())
      setFindMatches([])
      setColumnWidths({})
      cellRefs.current = {}
    }
  }, [filePath])

  const detectHeader = (rows: string[][]): boolean => {
    if (rows.length < 2) return false
    const headerRow = rows[0] || []
    const body = rows.slice(1)
    const numCols = Math.max(headerRow.length, body.reduce((max, r) => Math.max(max, r.length), 0))
    if (numCols === 0) return false
    const bodyTypes = Array.from({ length: numCols }, (_, i) => estimateColumnType(body.map(r => r[i] || '')))
    const headerTypes = Array.from({ length: numCols }, (_, i) => estimateColumnType([headerRow[i] || '']))
    return !headerTypes.every((t, i) => t === bodyTypes[i])
  }

  const saveFile = useCallback(async (): Promise<void> => {
    if (!filePath || !editor) return
    const content = serializeRows(rawRows, delimiter)
    if (content === originalContent && !editor.isDirty) return
    try {
      setIsSaving(true); setError(null)
      await editorAPI.updateFileContent(filePath, content, version)
      setOriginalContent(content)
      setVersion(v => v + 1)
      setSaved(tabId, version + 1)
      updateTab(tabId, { isDirty: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [filePath, editor, rawRows, delimiter, originalContent, version, setSaved, updateTab, tabId])

  useEffect(() => { registerSaveCallback(tabId, saveFile); return () => unregisterSaveCallback(tabId) }, [tabId, registerSaveCallback, unregisterSaveCallback, saveFile])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveFile(); return }
      handleGlobalKeyDown(e)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile])

  const setSingleSelection = useCallback((coords: CellCoords) => { setSelection(new Set([keyFor(coords.row, coords.col)])); setAnchor(coords); setRangeEnd(coords) }, [])
  const selectRange = useCallback((start: CellCoords, end: CellCoords) => {
    const next = new Set<string>()
    const minRow = Math.min(start.row, end.row), maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col), maxCol = Math.max(start.col, end.col)
    for (let r = minRow; r <= maxRow; r++) for (let c = minCol; c <= maxCol; c++) next.add(keyFor(r, c))
    setSelection(next)
  }, [])
  const selectFullColumnRange = useCallback((startCol: number, endCol: number) => {
    const next = new Set<string>()
    const minCol = Math.min(startCol, endCol), maxCol = Math.max(startCol, endCol)
    for (let c = minCol; c <= maxCol; c++) {
      next.add(keyFor(HEADER_ROW, c))
      dataRows.forEach((_, r) => next.add(keyFor(dataStartRow() + r, c)))
    }
    setSelection(next)
  }, [dataRows, dataStartRow])
  const selectFullRowRange = useCallback((startRow: number, endRow: number) => {
    const next = new Set<string>()
    const minRow = Math.min(startRow, endRow), maxRow = Math.max(startRow, endRow)
    for (let r = minRow; r <= maxRow; r++) for (let c = SERIAL_COL; c < numColumns; c++) next.add(keyFor(r, c))
    setSelection(next)
  }, [numColumns])
  const selectAllCells = useCallback(() => {
    const next = new Set<string>()
    if (hasHeader) for (let c = 0; c < numColumns; c++) next.add(keyFor(HEADER_ROW, c))
    dataRows.forEach((_, r) => { next.add(keyFor(dataStartRow() + r, SERIAL_COL)); for (let c = 0; c < numColumns; c++) next.add(keyFor(dataStartRow() + r, c)) })
    setSelection(next)
  }, [hasHeader, numColumns, dataRows, dataStartRow])

  const getCellValue = (row: number, col: number): string => {
    if (col === SERIAL_COL) return ''
    if (row === HEADER_ROW && hasHeader) return headers[col] || ''
    const dataIndex = hasHeader ? row - 1 : row
    return (rawRows[dataIndex] || [])[col] || ''
  }

  const updateCellValue = (row: number, col: number, value: string) => {
    if (col === SERIAL_COL) return
    setRawRows(prev => {
      const next = prev.map(r => [...r])
      const dataIndex = hasHeader ? row - 1 : row
      if (!next[dataIndex]) next[dataIndex] = []
      while (next[dataIndex].length <= col) next[dataIndex].push('')
      next[dataIndex][col] = value
      return next
    })
  }

  const startEdit = (coords: CellCoords, initialChar?: string) => {
    const value = getCellValue(coords.row, coords.col)
    setEditingCell(coords); setEditValue(initialChar ?? value); setSelection(new Set()); setAnchor(null); setRangeEnd(null)
  }
  const commitEdit = (value: string) => {
    if (!editingCell) return
    updateCellValue(editingCell.row, editingCell.col, value)
    setEditingCell(null); setEditValue(''); setSingleSelection(editingCell)
  }
  const cancelEdit = () => { if (!editingCell) return; setEditingCell(null); setEditValue(''); setSingleSelection(editingCell) }

  const clearSelectedCells = () => {
    Array.from(selection).map(k => parseCoords(k)).filter(c => c && c.col >= 0).forEach(c => c && updateCellValue(c.row, c.col, ''))
  }

  const copySelection = () => {
    const coords = Array.from(selection).map(k => parseCoords(k)).filter((c): c is CellCoords => !!c && c.col >= 0 && c.row >= 0)
    if (coords.length === 0) return
    const rows = coords.map(c => c.row), cols = coords.map(c => c.col)
    const minRow = Math.min(...rows), maxRow = Math.max(...rows), minCol = Math.min(...cols), maxCol = Math.max(...cols)
    const lines: string[] = []
    for (let r = minRow; r <= maxRow; r++) {
      const line: string[] = []
      for (let c = minCol; c <= maxCol; c++) line.push(getCellValue(r, c))
      lines.push(line.join(delimiter))
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (editingCell || e.target instanceof Element && e.target.closest('#csv-find-replace')) return
    const text = e.clipboardData.getData('text/plain')
    if (!text || !anchor) return
    e.preventDefault()
    const parsedRows = text.split(/\r?\n/).filter(line => line.length > 0).map(line => parseCsvLine(line, delimiter))
    const anchorRow = anchor.row; const anchorCol = anchor.col
    if (anchorCol < 0) return
    setRawRows(prev => {
      const next = prev.map(r => [...r])
      const baseDataIndex = hasHeader ? anchorRow - 1 : anchorRow
      parsedRows.forEach((row, r) => {
        const dataIndex = baseDataIndex + r
        if (!next[dataIndex]) { for (let i = next.length; i <= dataIndex; i++) next.push(Array.from({ length: numColumns }, () => '')) }
        row.forEach((value, c) => {
          const colIndex = anchorCol + c
          if (colIndex < 0) return
          while (next[dataIndex].length <= colIndex) next[dataIndex].push('')
          next[dataIndex][colIndex] = value
        })
      })
      return next
    })
    const endRow = anchorRow + parsedRows.length - 1
    const endCol = anchorCol + Math.max(...parsedRows.map(r => r.length)) - 1
    selectRange(anchor, { row: endRow, col: endCol })
  }

  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof Element && e.target.closest('#csv-find-replace')) return
    const key = e.key; const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && key.toLowerCase() === 'f') { e.preventDefault(); setFindOpen(true); setFindExpanded(false); return }
    if (ctrl && key.toLowerCase() === 'h') { e.preventDefault(); setFindOpen(true); setFindExpanded(true); return }
    if (findOpen && key === 'Escape') { e.preventDefault(); setFindOpen(false); return }
    if (ctrl && key === 'a' && !editingCell) { e.preventDefault(); selectAllCells(); return }
    if (ctrl && key === 'c' && selection.size > 0 && !editingCell) { e.preventDefault(); copySelection(); return }
    if (!editingCell && selection.size > 0 && (key === 'Delete' || key === 'Backspace')) { e.preventDefault(); clearSelectedCells(); return }
    if (!editingCell && anchor && key.length === 1 && !ctrl && !e.altKey) { e.preventDefault(); startEdit(anchor, key); return }
    if (!editingCell && anchor && key === 'Enter') { e.preventDefault(); startEdit(anchor); return }
    if (!editingCell && anchor && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault()
      const ref = e.shiftKey && rangeEnd ? rangeEnd : anchor
      let targetRow = ref.row, targetCol = ref.col
      if (key === 'ArrowUp') targetRow = ref.row - 1
      if (key === 'ArrowDown') targetRow = ref.row + 1
      if (key === 'ArrowLeft') targetCol = ref.col - 1
      if (key === 'ArrowRight') targetCol = ref.col + 1
      if (targetRow < 0 || targetCol < 0 || targetCol >= numColumns) return
      if (e.shiftKey && rangeEnd) { setRangeEnd({ row: targetRow, col: targetCol }); selectRange(anchor, { row: targetRow, col: targetCol }) }
      else { setSingleSelection({ row: targetRow, col: targetCol }) }
      focusCell(targetRow, targetCol)
      return
    }
    if (!editingCell && anchor && key === 'Tab') {
      e.preventDefault()
      const { row, col } = anchor
      let targetRow = row, targetCol = col + (e.shiftKey ? -1 : 1)
      if (targetCol >= numColumns) { targetRow = row + 1; targetCol = 0 }
      if (targetCol < 0) { if (targetRow <= dataStartRow()) return; targetRow = row - 1; targetCol = numColumns - 1 }
      setSingleSelection({ row: targetRow, col: targetCol }); focusCell(targetRow, targetCol)
    }
    if (editingCell && key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const focusCell = (row: number, col: number) => {
    const dataIndex = hasHeader ? row - 1 : row
    if (dataIndex >= visibleCount) {
      setVisibleCount(prev => Math.min(Math.ceil((dataIndex + 1) / BATCH_SIZE) * BATCH_SIZE, dataRows.length))
    }
    requestAnimationFrame(() => {
      const el = cellRefs.current[keyFor(row, col)]
      if (el) { try { el.focus({ preventScroll: true }) } catch { el.focus() }; el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }) }
    })
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizeState.current) {
        const delta = e.clientX - resizeState.current.startX
        const newWidth = Math.max(MIN_COL_WIDTH, resizeState.current.startWidth + delta)
        setColumnWidths(prev => ({ ...prev, [String(resizeState.current!.col)]: newWidth }))
      }
    }
    const onMouseUp = () => { resizeState.current = null; setIsSelecting(false) }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const handleCellMouseDown = (e: React.MouseEvent, row: number, col: number, isHeaderCell: boolean, isRowIndexCell: boolean) => {
    if (e.button !== 0) return
    if (isHeaderCell && col >= 0) {
      const el = cellRefs.current[keyFor(HEADER_ROW, col)]
      if (el) {
        const rect = el.getBoundingClientRect()
        if (e.clientX >= rect.right - 6 && e.clientX <= rect.right) {
          e.preventDefault()
          resizeState.current = { col, startX: e.clientX, startWidth: effectiveColumnWidths[String(col)] || MIN_COL_WIDTH }
          return
        }
      }
    }
    e.preventDefault()
    if (e.shiftKey && anchor) {
      if (isHeaderCell && col >= 0) { selectFullColumnRange(anchor.col, col); setRangeEnd({ row, col }) }
      else if (isRowIndexCell) { selectFullRowRange(anchor.row, row); setRangeEnd({ row, col }) }
      else if (col >= 0) { selectRange(anchor, { row, col }); setRangeEnd({ row, col }) }
      return
    }
    setSelectionMode(isHeaderCell && col >= 0 ? 'column' : isRowIndexCell ? 'row' : 'cell')
    setIsSelecting(true); setSingleSelection({ row, col })
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !anchor) return
    if (selectionMode === 'cell' && col >= 0) { setRangeEnd({ row, col }); selectRange(anchor, { row, col }) }
    else if (selectionMode === 'column' && col >= 0) { setRangeEnd({ row, col }); selectFullColumnRange(anchor.col, col) }
    else if (selectionMode === 'row') { setRangeEnd({ row, col }); selectFullRowRange(anchor.row, row) }
  }

  const handleContextMenu = (e: React.MouseEvent, row: number, col: number, isHeader: boolean) => {
    if (col === SERIAL_COL && row === HEADER_ROW) return
    e.preventDefault()
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, row, col, isHeader })
  }

  const insertRows = (index: number, count: number) => {
    setRawRows(prev => {
      const next = prev.map(r => [...r])
      const dataIndex = hasHeader ? index - 1 : index
      const emptyRow = Array.from({ length: numColumns }, () => '')
      for (let i = 0; i < count; i++) next.splice(Math.max(0, dataIndex), 0, [...emptyRow])
      return next
    })
    setContextMenu(null)
  }
  const deleteRows = (indices: number[]) => {
    const toRemove = new Set(indices.map(r => hasHeader ? r - 1 : r))
    setRawRows(prev => prev.filter((_, i) => !toRemove.has(i)))
    setSelection(new Set()); setContextMenu(null)
  }
  const insertColumns = (index: number, count: number) => {
    setRawRows(prev => prev.map(row => { const next = [...row]; for (let i = 0; i < count; i++) next.splice(index, 0, ''); return next }))
    setContextMenu(null)
  }
  const deleteColumns = (indices: number[]) => {
    const toRemove = new Set(indices)
    setRawRows(prev => prev.map(row => row.filter((_, i) => !toRemove.has(i))))
    setSelection(new Set()); setContextMenu(null)
  }
  const sortColumn = (col: number, ascending: boolean) => {
    setRawRows(prev => {
      if (hasHeader) {
        const header = prev[0]
        const sorted = [...prev.slice(1)].sort((a, b) => {
          const av = (a[col] || '').trim(), bv = (b[col] || '').trim()
          const an = Number(av), bn = Number(bv)
          if (!isNaN(an) && !isNaN(bn)) return ascending ? an - bn : bn - an
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
        })
        return [header, ...sorted]
      }
      return [...prev].sort((a, b) => {
        const av = (a[col] || '').trim(), bv = (b[col] || '').trim()
        const an = Number(av), bn = Number(bv)
        if (!isNaN(an) && !isNaN(bn)) return ascending ? an - bn : bn - an
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    })
    setContextMenu(null)
  }

  const runFind = (preserveIndex = false) => {
    if (!findQuery) { setFindMatches([]); setCurrentMatchIndex(-1); return }
    let source = regex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) source = `\\b(?:${source})\\b`
    try {
      const reg = new RegExp(source, `${matchCase ? '' : 'i'}`)
      const matches: CellCoords[] = []
      rawRows.forEach((row, r) => row.forEach((cell, c) => { if (reg.test(cell)) matches.push({ row: r, col: c }) }))
      setFindMatches(matches)
      const nextIndex = preserveIndex && currentMatchIndex >= 0 ? Math.min(currentMatchIndex, matches.length - 1) : 0
      setCurrentMatchIndex(matches.length > 0 ? nextIndex : -1)
      if (matches[nextIndex]) focusCell(matches[nextIndex].row, matches[nextIndex].col)
    } catch {
      setFindMatches([]); setCurrentMatchIndex(-1)
    }
  }

  const replaceInText = (text: string, all: boolean): string => {
    let source = regex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) source = `\\b(?:${source})\\b`
    try {
      const reg = new RegExp(source, `${all ? 'g' : ''}${matchCase ? '' : 'i'}`)
      if (!preserveCase) return text.replace(reg, replaceQuery)
      return text.replace(reg, matched => {
        if (matched === matched.toUpperCase()) return replaceQuery.toUpperCase()
        if (matched === matched.toLowerCase()) return replaceQuery.toLowerCase()
        const first = matched.charAt(0), rest = matched.slice(1)
        if (first === first.toUpperCase() && rest === rest.toLowerCase()) return replaceQuery.charAt(0).toUpperCase() + replaceQuery.slice(1).toLowerCase()
        return replaceQuery
      })
    } catch { return text }
  }
  const replaceCurrent = () => {
    if (findMatches.length === 0 || currentMatchIndex < 0) return
    const match = findMatches[currentMatchIndex]
    const original = getCellValue(match.row, match.col)
    const next = replaceInText(original, false)
    if (next !== original) updateCellValue(match.row, match.col, next)
    runFind(true)
  }
  const replaceAll = () => {
    const seen = new Set<string>()
    findMatches.forEach(match => {
      const k = keyFor(match.row, match.col)
      if (seen.has(k)) return
      seen.add(k)
      const original = getCellValue(match.row, match.col)
      const next = replaceInText(original, true)
      if (next !== original) updateCellValue(match.row, match.col, next)
    })
    runFind(false)
  }
  const navigateFind = (reverse: boolean) => {
    if (findMatches.length === 0) return
    const next = ((currentMatchIndex + (reverse ? -1 : 1)) % findMatches.length + findMatches.length) % findMatches.length
    setCurrentMatchIndex(next)
    focusCell(findMatches[next].row, findMatches[next].col)
  }

  useEffect(() => { if (findOpen) { setTimeout(() => findInputRef.current?.focus(), 0); runFind(true) } }, [findOpen])
  useEffect(() => { if (findOpen) runFind(true) }, [findQuery, matchCase, wholeWord, regex])

  useEffect(() => { setVisibleCount(BATCH_SIZE) }, [filePath])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scrollContainer = containerRef.current?.querySelector('.flex-1.overflow-auto')
    if (!sentinel || !scrollContainer) return
    const io = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && visibleCount < dataRows.length) {
        setVisibleCount(prev => Math.min(prev + BATCH_SIZE, dataRows.length))
      }
    }, { root: scrollContainer as HTMLElement, rootMargin: '0px 0px 300px 0px' })
    io.observe(sentinel)
    return () => io.disconnect()
  }, [visibleCount, dataRows.length])

  const downloadFile = async () => {
    try {
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filePath.split('/').pop() || 'data'
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { console.error('Download failed', err) }
  }

  const renderCell = (row: number, col: number, value: string, isHeaderCell: boolean, isRowIndex: boolean, displayIndex?: number) => {
    const selected = selection.has(keyFor(row, col))
    const width = col >= 0 ? effectiveColumnWidths[String(col)] : Math.max(4, String(dataRows.length + 1).length + 1) * 8 + 16
    const color = col >= 0 ? columnColors[col] : undefined
    const isFindMatch = findMatches.some(m => m.row === row && m.col === col)
    const isActiveMatch = findMatches[currentMatchIndex] && findMatches[currentMatchIndex].row === row && findMatches[currentMatchIndex].col === col
    const cellRef = (el: HTMLTableCellElement | null) => { cellRefs.current[keyFor(row, col)] = el }
    const common = {
      ref: cellRef, tabIndex: 0, 'data-row': row, 'data-col': col,
      onMouseDown: (e: React.MouseEvent) => handleCellMouseDown(e, row, col, isHeaderCell, isRowIndex),
      onMouseEnter: () => handleCellMouseEnter(row, col),
      onMouseUp: () => setIsSelecting(false),
      onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, row, col, isHeaderCell),
      onDoubleClick: (e: React.MouseEvent) => { if (!isRowIndex && col >= 0) { e.preventDefault(); startEdit({ row, col }) } },
      style: { width: col >= 0 ? width : undefined, minWidth: col >= 0 ? width : 48, maxWidth: col >= 0 ? width : undefined, color: isHeaderCell ? undefined : color },
      className: [
        'relative border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-inset focus:ring-primary/50',
        isHeaderCell ? 'sticky top-0 z-10 bg-card font-semibold whitespace-nowrap overflow-hidden text-ellipsis select-none' : 'overflow-visible whitespace-pre-wrap',
        isRowIndex ? 'bg-muted/50 text-muted-foreground text-center select-none cursor-pointer' : 'cursor-cell',
        selected ? 'bg-primary/20 dark:bg-primary/30' : isRowIndex ? '' : 'bg-card',
        isActiveMatch ? 'bg-yellow-200 dark:bg-yellow-900/50' : isFindMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : '',
        'border-border'
      ].join(' ')
    }
    if (isHeaderCell) return <th key={col} {...common}>{value}</th>
    return <td key={col} {...common}>{isRowIndex ? displayIndex : renderCellContent(value)}</td>
  }

  const renderCellContent = (value: string) => {
    const urlPattern = /\b(?:(?:https?:\/\/|ftp:\/\/|mailto:)[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = urlPattern.exec(value)) !== null) {
      parts.push(value.slice(lastIndex, match.index))
      const url = match[0]
      parts.push(<span key={match.index} className="csv-link underline cursor-pointer text-blue-600 dark:text-blue-400" onClick={e => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); window.open(url.startsWith('www.') ? `https://${url}` : url, '_blank') } }} title="Ctrl/Cmd+click to open">{url}</span>)
      lastIndex = match.index + url.length
    }
    parts.push(value.slice(lastIndex))
    return parts
  }

  if (isLoading) return <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading spreadsheet...</div>
  if (error) return <div className="flex items-center justify-center h-full"><div className="text-center text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2" /><p className="mb-2">Error loading spreadsheet</p><p className="text-sm text-muted-foreground">{error}</p><button onClick={loadFile} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Retry</button></div></div>

  return (
    <div className="h-full w-full flex flex-col relative" onPaste={handlePaste} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input type="text" placeholder="Find..." value={findQuery} onChange={e => setFindQuery(e.target.value)} onFocus={() => setFindOpen(true)} className="pl-7 pr-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring w-36" />
          </div>
          <label className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-pointer select-none"><input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} className="rounded h-3 w-3" />Header</label>
          <span className="text-[10px] text-muted-foreground">{visibleCount < dataRows.length ? `${visibleCount}/${dataRows.length}` : dataRows.length}×{numColumns}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={saveFile} disabled={!isDirty || isSaving} title="Save" className="flex items-center justify-center w-6 h-6 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">{isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</button>
          <button onClick={downloadFile} title="Download" className="flex items-center justify-center w-6 h-6 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"><Download className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse table-fixed">
          <thead>
            <tr>
              <th data-row={HEADER_ROW} data-col={SERIAL_COL} onMouseDown={e => { e.preventDefault(); selectAllCells() }} className="sticky top-0 left-0 z-20 bg-card border border-border px-2 py-1 text-xs text-muted-foreground cursor-pointer select-none">#</th>
              {hasHeader
                ? headers.map((h, c) => renderCell(HEADER_ROW, c, h, true, false))
                : Array.from({ length: numColumns }, (_, c) => renderCell(HEADER_ROW, c, `Col ${c + 1}`, true, false))}
            </tr>
          </thead>
          <tbody>
            {dataRows.slice(0, visibleCount).map((row, r) => {
              const absRow = dataStartRow() + r
              return <tr key={absRow}>{renderCell(absRow, SERIAL_COL, '', false, true, r + 1)}{Array.from({ length: numColumns }, (_, c) => renderCell(absRow, c, row[c] || '', false, false))}</tr>
            })}
            {visibleCount < dataRows.length && (
              <tr ref={sentinelRef} style={{ height: 1 }}>
                <td colSpan={numColumns + 1} className="text-center text-xs text-muted-foreground py-2 border-b border-border">
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />Loading {visibleCount}/{dataRows.length} rows...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* In-cell editor overlay */}
      {editingCell && (() => {
        const el = cellRefs.current[keyFor(editingCell.row, editingCell.col)]
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return (
          <div className="fixed z-50 bg-background border border-primary shadow-lg rounded-sm" style={{ left: rect.left, top: rect.top, width: rect.width, minHeight: rect.height }}>
            <div
              ref={node => { if (node) { node.focus(); const range = document.createRange(); range.selectNodeContents(node); range.collapse(false); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range) }}}
              contentEditable suppressContentEditableWarning className="w-full h-full p-2 text-sm outline-none whitespace-pre-wrap" style={{ color: columnColors[editingCell.col] }}
              onBlur={e => commitEdit(e.currentTarget.textContent || '')}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(e.currentTarget.textContent || ''); const { row, col } = editingCell; const nextRow = row + 1; if (nextRow < dataStartRow() + dataRows.length) { setSingleSelection({ row: nextRow, col }); focusCell(nextRow, col) } }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                else if (e.key === 'Tab') { e.preventDefault(); commitEdit(e.currentTarget.textContent || ''); const { row, col } = editingCell; let nextRow = row, nextCol = col + (e.shiftKey ? -1 : 1); if (nextCol >= numColumns) { nextRow = row + 1; nextCol = 0 } if (nextCol < 0) { nextRow = row - 1; nextCol = numColumns - 1 } if (nextRow >= dataStartRow() && nextRow < dataStartRow() + dataRows.length) { setSingleSelection({ row: nextRow, col: nextCol }); focusCell(nextRow, nextCol) } }
              }}
            >{editValue}</div>
          </div>
        )
      })()}

      {/* Find/Replace Widget */}
      {findOpen && (
        <div id="csv-find-replace" className="absolute top-1 right-1 z-50 w-[420px] bg-popover border border-border rounded-md shadow-lg p-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <div className="flex-1 relative">
              <input ref={findInputRef} type="text" value={findQuery} onChange={e => setFindQuery(e.target.value)} placeholder="Find" className="w-full pl-2 pr-20 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); navigateFind(e.shiftKey) } if (e.key === 'Escape') { e.preventDefault(); setFindOpen(false) } }} />
              <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button onClick={() => setMatchCase(v => !v)} className={`px-1 py-0.5 text-[10px] rounded ${matchCase ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Aa</button>
                <button onClick={() => setWholeWord(v => !v)} className={`px-1 py-0.5 text-[10px] rounded ${wholeWord ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>ab</button>
                <button onClick={() => setRegex(v => !v)} className={`px-1 py-0.5 text-[10px] rounded ${regex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>.*</button>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground w-16 text-right">{findMatches.length > 0 ? `${currentMatchIndex + 1}/${findMatches.length}` : 'No results'}</span>
            <button onClick={() => navigateFind(true)} disabled={findMatches.length === 0} className="p-1 rounded hover:bg-muted disabled:opacity-40"><ArrowUp className="h-3 w-3" /></button>
            <button onClick={() => navigateFind(false)} disabled={findMatches.length === 0} className="p-1 rounded hover:bg-muted disabled:opacity-40"><ArrowDown className="h-3 w-3" /></button>
            <button onClick={() => setFindOpen(false)} className="p-1 rounded hover:bg-muted"><X className="h-3 w-3" /></button>
          </div>
          {findExpanded && (
            <div className="flex items-center gap-1">
              <div className="flex-1 relative">
                <input type="text" value={replaceQuery} onChange={e => setReplaceQuery(e.target.value)} placeholder="Replace" className="w-full pl-2 pr-10 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); replaceCurrent() } if (e.key === 'Escape') { e.preventDefault(); setFindOpen(false) } }} />
                <button onClick={() => setPreserveCase(v => !v)} className={`absolute right-0.5 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[10px] rounded ${preserveCase ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>AB</button>
              </div>
              <button onClick={replaceCurrent} disabled={findMatches.length === 0} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-40">Replace</button>
              <button onClick={replaceAll} disabled={findMatches.length === 0} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-40">All</button>
            </div>
          )}
          <button onClick={() => setFindExpanded(v => !v)} className="self-start text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            {findExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}{findExpanded ? 'Hide replace' : 'Show replace'}
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div className="fixed z-[100] bg-popover border border-border rounded-md shadow-xl py-1 min-w-[180px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.isHeader && contextMenu.col >= 0 && (
            <><div onClick={() => sortColumn(contextMenu.col, true)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Sort A-Z</div><div onClick={() => sortColumn(contextMenu.col, false)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Sort Z-A</div><div className="border-t border-border my-1" /></>
          )}
          {contextMenu.row >= 0 && (
            <><div onClick={() => insertRows(contextMenu.row, 1)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Add row above</div><div onClick={() => insertRows(contextMenu.row + 1, 1)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Add row below</div><div onClick={() => deleteRows([contextMenu.row])} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer text-destructive">Delete row</div><div className="border-t border-border my-1" /></>
          )}
          {contextMenu.col >= 0 && (
            <><div onClick={() => insertColumns(contextMenu.col, 1)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Add column left</div><div onClick={() => insertColumns(contextMenu.col + 1, 1)} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Add column right</div><div onClick={() => deleteColumns([contextMenu.col])} className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer text-destructive">Delete column</div></>
          )}
        </div>
      )}
    </div>
  )
}

export default CsvSpreadsheet
