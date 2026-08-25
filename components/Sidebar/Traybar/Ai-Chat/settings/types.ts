export interface ProviderInfo {
  id: string
  name: string
  base_url: string
  configured: boolean
  available: boolean
}

export interface AgentInfo {
  name: string
  description?: string
}

export interface SkillInfo {
  name: string
  description?: string
  body?: string
  path?: string
  writable?: boolean
}

export interface CommandInfo {
  name: string
  description?: string
}

export interface KnowledgeStats {
  total_entries?: number
  categories?: Record<string, number>
  [key: string]: any
}

export interface InstructionFile {
  path?: string
  name?: string
  content?: string
}

export interface DatabaseInfo {
  id: string
  name: string
  description: string
  category: string
}

export interface TestResult {
  reachable: boolean
  message: string
}
