import { useState, useEffect, useCallback } from "react"
import { getApiBaseUrl } from "@/config/server"
import { useChatStore } from "../components/chatStore"
import { wsService } from "../hooks/wsService"
import type {
  ProviderInfo,
  AgentInfo,
  SkillInfo,
  CommandInfo,
  KnowledgeStats,
  InstructionFile,
  DatabaseInfo,
  TestResult,
} from "./types"

export function useChatSettings(open: boolean) {
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null)
  const [instructions, setInstructions] = useState<InstructionFile[]>([])
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [dbSearch, setDbSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Provider URL config state
  const [ollamaUrl, setOllamaUrl] = useState("")
  const [ollamaUrlEnv, setOllamaUrlEnv] = useState("")
  const [isCustomUrl, setIsCustomUrl] = useState(false)
  const [urlSaving, setUrlSaving] = useState(false)
  const [urlTesting, setUrlTesting] = useState(false)
  const [urlTestResult, setUrlTestResult] = useState<TestResult | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  // ZAI API key config state
  const [zaiApiKey, setZaiApiKey] = useState("")
  const [zaiApiKeyId, setZaiApiKeyId] = useState("")
  const [zaiKeyMasked, setZaiKeyMasked] = useState("")
  const [zaiKeyIdMasked, setZaiKeyIdMasked] = useState("")
  const [zaiKeyIsSet, setZaiKeyIsSet] = useState(false)
  const [zaiKeyIsCustom, setZaiKeyIsCustom] = useState(false)
  const [zaiKeyIsFromEnv, setZaiKeyIsFromEnv] = useState(false)
  const [zaiKeySaving, setZaiKeySaving] = useState(false)
  const [zaiKeyTesting, setZaiKeyTesting] = useState(false)
  const [zaiKeyTestResult, setZaiKeyTestResult] = useState<TestResult | null>(null)
  const [zaiKeyError, setZaiKeyError] = useState<string | null>(null)
  const [zaiKeyShow, setZaiKeyShow] = useState(false)
  const [zaiKeyEditing, setZaiKeyEditing] = useState(false)

  const {
    enabledDatabases,
    toggleDatabase,
    setEnabledDatabases,
    keepIntermediateFiles,
    setKeepIntermediateFiles,
    permissionMode,
    setPermissionMode,
    resetPermissionMode,
  } = useChatStore()

  // Permission state
  const [permAllowedTools, setPermAllowedTools] = useState<string[]>([])
  const [permDeniedTools, setPermDeniedTools] = useState<string[]>([])
  const [permSaving, setPermSaving] = useState(false)
  const [permError, setPermError] = useState<string | null>(null)

  // Skill CRUD state
  const [skillSaving, setSkillSaving] = useState(false)
  const [skillError, setSkillError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [provRes, agRes, skRes, cmdRes, knRes, instRes, dbRes, cfgRes, permRes, zaiCfgRes] = await Promise.allSettled([
        fetch(`${getApiBaseUrl()}/ai-chat/providers`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/agents`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/skills`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/commands`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/stats`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/instructions`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/databases`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/providers/config`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/permissions`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/providers/zai-config`).then(r => r.ok ? r.json() : null),
      ])

      if (provRes.status === 'fulfilled' && provRes.value) setProviders(provRes.value.providers || [])
      if (agRes.status === 'fulfilled') setAgents(agRes.value || [])
      if (skRes.status === 'fulfilled') setSkills(skRes.value || [])
      if (cmdRes.status === 'fulfilled') setCommands(cmdRes.value || [])
      if (knRes.status === 'fulfilled') setKnowledgeStats(knRes.value)
      if (instRes.status === 'fulfilled') setInstructions(instRes.value || [])
      if (dbRes.status === 'fulfilled') setDatabases(dbRes.value || [])
      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setOllamaUrl(cfgRes.value.base_url || "")
        setOllamaUrlEnv(cfgRes.value.env_default || "")
        setIsCustomUrl(cfgRes.value.is_custom || false)
      }
      if (zaiCfgRes.status === 'fulfilled' && zaiCfgRes.value) {
        setZaiKeyIsSet(zaiCfgRes.value.is_set || false)
        setZaiKeyMasked(zaiCfgRes.value.masked_key || "")
        setZaiKeyIdMasked(zaiCfgRes.value.masked_key_id || "")
        setZaiKeyIsCustom(zaiCfgRes.value.is_custom || false)
        setZaiKeyIsFromEnv(zaiCfgRes.value.is_from_env || false)
        setZaiKeyEditing(false)
        setZaiApiKey("")
        setZaiApiKeyId("")
      }
      if (permRes.status === 'fulfilled' && permRes.value) {
        setPermAllowedTools(permRes.value.allowed || [])
        setPermDeniedTools(permRes.value.denied || [])
        const serverMode = permRes.value.mode || 'default'
        // Read imperatively so this callback stays stable — depending on
        // permissionMode would recreate fetchAll on every mode change and
        // retrigger the effect below, causing a fetch/setState loop.
        const currentMode = useChatStore.getState().permissionMode
        if (serverMode === 'bypass' && currentMode !== 'bypass') {
          setPermissionMode('bypass')
        } else if (serverMode === 'default' && currentMode !== 'default' && currentMode !== 'bypass') {
          setPermissionMode('default')
        }
      }
    } catch (err) {
      setError("Failed to fetch backend status")
    } finally {
      setLoading(false)
    }
  }, [setPermissionMode])

  const handleSaveUrl = useCallback(async () => {
    setUrlSaving(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: ollamaUrl }),
      })
      const data = await resp.json()
      if (data.error) {
        setUrlError(data.error)
      } else {
        setOllamaUrl(data.base_url)
        setIsCustomUrl(data.base_url !== ollamaUrlEnv)
        setUrlTestResult({
          reachable: data.reachable,
          message: data.reachable ? "Connected successfully!" : "URL saved but server is not reachable.",
        })
        fetchAll()
      }
    } catch (err) {
      setUrlError("Failed to save URL")
    } finally {
      setUrlSaving(false)
    }
  }, [ollamaUrl, ollamaUrlEnv, fetchAll])

  const handleTestUrl = useCallback(async () => {
    setUrlTesting(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: ollamaUrl }),
      })
      const data = await resp.json()
      if (data.error) {
        setUrlError(data.error)
      } else {
        setUrlTestResult({
          reachable: data.reachable,
          message: data.reachable ? "Connected successfully!" : "Cannot reach Ollama at this URL.",
        })
      }
    } catch (err) {
      setUrlError("Failed to test URL")
    } finally {
      setUrlTesting(false)
    }
  }, [ollamaUrl])

  const handleResetUrl = useCallback(async () => {
    setUrlSaving(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, { method: "DELETE" })
      const data = await resp.json()
      setOllamaUrl(data.base_url)
      setIsCustomUrl(false)
      setUrlTestResult({ reachable: data.reachable, message: "Reset to environment default." })
      fetchAll()
    } catch (err) {
      setUrlError("Failed to reset URL")
    } finally {
      setUrlSaving(false)
    }
  }, [fetchAll])

  const handleTestZaiKey = useCallback(async () => {
    setZaiKeyTesting(true)
    setZaiKeyError(null)
    setZaiKeyTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/zai-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: zaiApiKey, api_key_id: zaiApiKeyId, test_only: true }),
      })
      const data = await resp.json()
      if (data.error) {
        setZaiKeyError(data.error)
      } else {
        setZaiKeyTestResult({
          reachable: data.reachable,
          message: data.reachable ? "Connection successful! API key is valid." : "Cannot reach Z.ai API with this key.",
        })
      }
    } catch (err) {
      setZaiKeyError("Failed to test API key")
    } finally {
      setZaiKeyTesting(false)
    }
  }, [zaiApiKey, zaiApiKeyId])

  const handleSaveZaiKey = useCallback(async () => {
    setZaiKeySaving(true)
    setZaiKeyError(null)
    setZaiKeyTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/zai-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: zaiApiKey, api_key_id: zaiApiKeyId }),
      })
      const data = await resp.json()
      if (data.error) {
        setZaiKeyError(data.error)
      } else {
        setZaiKeyIsSet(true)
        setZaiKeyMasked(data.masked_key || "")
        setZaiKeyIdMasked(data.masked_key_id || "")
        setZaiKeyIsCustom(true)
        setZaiKeyIsFromEnv(false)
        setZaiKeyEditing(false)
        setZaiApiKey("")
        setZaiApiKeyId("")
        setZaiKeyTestResult({
          reachable: data.reachable,
          message: data.reachable ? "API key saved and verified!" : "Key saved but could not verify (API may be temporarily unavailable).",
        })
        fetchAll()
      }
    } catch (err) {
      setZaiKeyError("Failed to save API key")
    } finally {
      setZaiKeySaving(false)
    }
  }, [zaiApiKey, fetchAll])

  const handleResetZaiKey = useCallback(async () => {
    setZaiKeySaving(true)
    setZaiKeyError(null)
    setZaiKeyTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/zai-config`, { method: "DELETE" })
      const data = await resp.json()
      setZaiKeyIsSet(data.is_set || false)
      setZaiKeyMasked(data.masked_key || "")
      setZaiKeyIdMasked(data.masked_key_id || "")
      setZaiKeyIsCustom(false)
      setZaiKeyIsFromEnv(data.is_set || false)
      setZaiKeyEditing(false)
      setZaiApiKey("")
      setZaiApiKeyId("")
      setZaiKeyTestResult({ reachable: false, message: "Cleared custom key. Reverted to env default." })
      fetchAll()
    } catch (err) {
      setZaiKeyError("Failed to reset API key")
    } finally {
      setZaiKeySaving(false)
    }
  }, [fetchAll])

  const handleSetPermissionMode = useCallback(async (mode: 'default' | 'bypass') => {
    setPermSaving(true)
    setPermError(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const data = await resp.json()
      if (data.error) {
        setPermError(data.error)
      } else {
        setPermissionMode(mode)
        setPermAllowedTools(data.allowed || [])
        setPermDeniedTools(data.denied || [])
        if (mode === 'bypass') {
          wsService.sendMessage({ type: 'set_permission_mode', mode: 'bypass' })
        } else {
          wsService.sendMessage({ type: 'set_permission_mode', mode: 'default' })
        }
      }
    } catch (err) {
      setPermError("Failed to update permission mode")
    } finally {
      setPermSaving(false)
    }
  }, [setPermissionMode])

  const handleResetPermissions = useCallback(async () => {
    setPermSaving(true)
    setPermError(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'reset' }),
      })
      const data = await resp.json()
      if (data.error) {
        setPermError(data.error)
      } else {
        resetPermissionMode()
        setPermAllowedTools(data.allowed || [])
        setPermDeniedTools(data.denied || [])
        wsService.sendMessage({ type: 'set_permission_mode', mode: 'bypass' })
      }
    } catch (err) {
      setPermError("Failed to reset permissions")
    } finally {
      setPermSaving(false)
    }
  }, [resetPermissionMode])

  const handleSaveSkill = useCallback(async (skill: { name: string; description: string; body: string }, originalName?: string) => {
    setSkillSaving(true)
    setSkillError(null)
    try {
      const isUpdate = !!originalName
      const url = isUpdate
        ? `${getApiBaseUrl()}/ai-chat/skills/${encodeURIComponent(originalName!)}`
        : `${getApiBaseUrl()}/ai-chat/skills`
      const resp = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skill),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setSkillError(data.detail || "Failed to save skill")
        return null
      }
      await fetchAll()
      return data
    } catch (err) {
      setSkillError("Failed to save skill")
      return null
    } finally {
      setSkillSaving(false)
    }
  }, [fetchAll])

  const handleDeleteSkill = useCallback(async (name: string) => {
    setSkillSaving(true)
    setSkillError(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/skills/${encodeURIComponent(name)}`, {
        method: "DELETE",
      })
      const data = await resp.json()
      if (!resp.ok) {
        setSkillError(data.detail || "Failed to delete skill")
        return false
      }
      await fetchAll()
      return true
    } catch (err) {
      setSkillError("Failed to delete skill")
      return false
    } finally {
      setSkillSaving(false)
    }
  }, [fetchAll])

  useEffect(() => {
    if (open) fetchAll()
  }, [open, fetchAll])

  return {
    // data
    loading, error,
    providers, agents, skills, commands, knowledgeStats, instructions, databases,
    // databases
    dbSearch, setDbSearch, enabledDatabases, toggleDatabase, setEnabledDatabases,
    // ollama url
    ollamaUrl, setOllamaUrl, ollamaUrlEnv, isCustomUrl,
    urlSaving, urlTesting, urlTestResult, setUrlTestResult, urlError, setUrlError,
    handleSaveUrl, handleTestUrl, handleResetUrl,
    // zai key
    zaiApiKey, setZaiApiKey, zaiApiKeyId, setZaiApiKeyId,
    zaiKeyMasked, zaiKeyIdMasked, zaiKeyIsSet, zaiKeyIsCustom, zaiKeyIsFromEnv,
    zaiKeySaving, zaiKeyTesting, zaiKeyTestResult, setZaiKeyTestResult, zaiKeyError, setZaiKeyError,
    zaiKeyShow, setZaiKeyShow, zaiKeyEditing, setZaiKeyEditing,
    handleSaveZaiKey, handleTestZaiKey, handleResetZaiKey,
    // permissions
    permissionMode, permAllowedTools, permDeniedTools, permSaving, permError,
    handleSetPermissionMode, handleResetPermissions,
    // session
    keepIntermediateFiles, setKeepIntermediateFiles,
    // skills CRUD
    skillSaving, skillError, setSkillError, handleSaveSkill, handleDeleteSkill,
  }
}

export type ChatSettings = ReturnType<typeof useChatSettings>
