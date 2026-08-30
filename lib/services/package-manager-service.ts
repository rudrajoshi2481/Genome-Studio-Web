/**
 * Package Manager Service — typed fetch wrappers for /api/v1/extensions-hub/*
 *
 * All package/node CRUD goes through the backend proxy, which validates nodes
 * using the workflow executor's convert_function_to_node logic before forwarding
 * to the standalone hub service.
 */
import { getApiBaseUrl } from '@/config/server';
import { getToken } from '@/lib/services/auth-service';

// Evaluate at call time, not at module load time, so the correct dynamic port
// is used in Electron mode (where the backend port is selected at runtime).
function getExtensionsHubBase(): string {
  return `${getApiBaseUrl()}/extensions-hub`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PackageNodeIO {
  id?: string;
  name: string;
  type: string;
  description?: string;
}

export interface PackageNode {
  id: number;
  version_id: number;
  title: string;
  function_name: string;
  language: string; // python | r | bash
  description?: string;
  source_code: string;
  inputs: PackageNodeIO[];
  outputs: PackageNodeIO[];
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PackageFile {
  id: number;
  version_id: number;
  name: string;
  file_type: string; // install | flow | node_json | other
  size?: number;
  created_at?: string;
}

export interface PackageVersion {
  id: number;
  package_id: number;
  version: string;
  changelog?: string;
  manifest?: Record<string, any>;
  published: boolean;
  created_at?: string;
  nodes: PackageNode[];
  files: PackageFile[];
}

export interface Package {
  id: number;
  name: string;
  display_name: string;
  description: string;
  author: string;
  tags: string[];
  license: string;
  visibility: string;
  icon_url: string | null;
  latest_version: string | null;
  download_count: number;
  created_at?: string;
  updated_at?: string;
  has_unpushed_changes?: boolean;
  working_version?: PackageVersion | null;
}

export interface PackageDetail extends Package {
  versions: PackageVersion[];
}

export interface ValidationResult {
  valid: boolean;
  node?: any;
  fields?: {
    title: string;
    function_name: string;
    language: string;
    source_code: string;
    inputs: PackageNodeIO[];
    outputs: PackageNodeIO[];
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail: any;
    try {
      detail = await resp.json();
    } catch {
      detail = { detail: await resp.text() };
    }
    const error = new Error(
      typeof detail.detail === 'string'
        ? detail.detail
        : detail.detail?.error || detail.detail?.message || `HTTP ${resp.status}`
    ) as any;
    error.status = resp.status;
    error.detail = detail.detail;
    throw error;
  }
  return resp.json();
}

// ---------------------------------------------------------------------------
// Package CRUD
// ---------------------------------------------------------------------------
export async function listPackages(params?: { q?: string; tag?: string; skip?: number; limit?: number }): Promise<Package[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.skip) query.set('skip', String(params.skip));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const resp = await fetch(`${getExtensionsHubBase()}/packages${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<Package[]>(resp);
}

// ---------------------------------------------------------------------------
// Backup — download all of the user's packages as a single JSON file
// ---------------------------------------------------------------------------
export async function backupPackages(): Promise<void> {
  const resp = await fetch(`${getExtensionsHubBase()}/backup`, {
    headers: authHeaders(),
  });
  if (!resp.ok) {
    let detail: any;
    try { detail = await resp.json(); } catch { detail = { detail: await resp.text() }; }
    throw new Error(
      typeof detail.detail === 'string'
        ? detail.detail
        : detail.detail?.error || detail.detail?.message || `HTTP ${resp.status}`
    );
  }
  // Parse the Content-Disposition header to recover the server-suggested filename
  const cd = resp.headers.get('content-disposition') || '';
  let filename = `extension-hub-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const match = cd.match(/filename="?([^";]+)"?/);
  if (match) filename = match[1];

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getPackage(packageId: number): Promise<PackageDetail> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function createPackage(data: {
  name: string;
  display_name: string;
  description?: string;
  description_md?: string;
  author?: string;
  tags?: string[];
  license?: string;
  visibility?: string;
}): Promise<PackageDetail> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function updatePackage(packageId: number, data: Partial<{
  display_name: string;
  description: string;
  description_md: string;
  author: string;
  tags: string[];
  license: string;
  visibility: string;
}>): Promise<PackageDetail> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function deletePackage(packageId: number): Promise<{ success: boolean; message: string }> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export async function uploadPackageIcon(packageId: number, file: File): Promise<{ success: boolean; icon_url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/icon`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(resp);
}

export async function deletePackageIcon(packageId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/icon`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export function getPackageIconUrl(packageId: number): string {
  return `${getExtensionsHubBase()}/packages/${packageId}/icon`;
}

// ---------------------------------------------------------------------------
// Version management
// ---------------------------------------------------------------------------
export async function listVersions(packageId: number): Promise<PackageVersion[]> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/versions`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageVersion[]>(resp);
}

export async function publishVersion(packageId: number, version: string, changelog?: string): Promise<PackageVersion> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/versions/publish`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ version, changelog }),
  });
  return handleResponse<PackageVersion>(resp);
}

// ---------------------------------------------------------------------------
// Node CRUD
// ---------------------------------------------------------------------------
export async function listNodes(packageId: number): Promise<PackageNode[]> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/nodes`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageNode[]>(resp);
}

export async function createNode(
  packageId: number,
  data: {
    title?: string;
    function_name?: string;
    language: string;
    description?: string;
    source_code: string;
    inputs?: PackageNodeIO[];
    outputs?: PackageNodeIO[];
    tags?: string[];
    validate?: boolean;
  }
): Promise<PackageNode> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/nodes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, validate: data.validate ?? true }),
  });
  return handleResponse<PackageNode>(resp);
}

export async function updateNode(
  packageId: number,
  nodeId: number,
  data: Partial<{
    title: string;
    function_name: string;
    language: string;
    description: string;
    source_code: string;
    inputs: PackageNodeIO[];
    outputs: PackageNodeIO[];
    tags: string[];
    validate?: boolean;
  }>
): Promise<PackageNode> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, validate: data.validate ?? true }),
  });
  return handleResponse<PackageNode>(resp);
}

export async function deleteNode(packageId: number, nodeId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// Validation (standalone — validate without saving)
// ---------------------------------------------------------------------------
export async function validateNode(code: string, language: string = 'python'): Promise<ValidationResult> {
  const resp = await fetch(`${getExtensionsHubBase()}/validate-node`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, language }),
  });
  return handleResponse<ValidationResult>(resp);
}

// ---------------------------------------------------------------------------
// File upload/download
// ---------------------------------------------------------------------------
export async function uploadFile(packageId: number, file: File, fileType: string = 'other'): Promise<PackageFile> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse<PackageFile>(resp);
}

export async function deleteFile(packageId: number, fileId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export function getFileDownloadUrl(packageId: number, fileId: number): string {
  return `${getExtensionsHubBase()}/packages/${packageId}/files/${fileId}`;
}

// ---------------------------------------------------------------------------
// install.sh — get/update by name
// ---------------------------------------------------------------------------
export async function getInstallSh(packageId: number, version?: string): Promise<{ content: string; file_id: number | null }> {
  const url = new URL(`${getExtensionsHubBase()}/packages/${packageId}/install.sh`, window.location.origin);
  if (version) url.searchParams.set('version', version);
  const resp = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export async function updateInstallSh(packageId: number, content: string): Promise<{ content: string; file_id: number }> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/install.sh`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// README.md — read from the git tree (read-only on hub, arrives via git push)
// ---------------------------------------------------------------------------
export async function getReadme(packageId: number, ref?: string): Promise<{ content: string }> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/readme${params}`, {
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// Install — upload a package's published nodes to the user's custom_nodes table
// ---------------------------------------------------------------------------
export interface InstallResult {
  package_id: number;
  package_name: string;
  version: string;
  total: number;
  installed: number;
  failed: number;
  results: Array<{
    index: number;
    title: string | null;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    node_id?: string;
    db_id?: number;
  }>;
  install_sh?: {
    ran: boolean;
    output: string;
    error: string | null;
  };
}

export async function installPackage(packageId: number, version?: string): Promise<InstallResult> {
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/install`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ version: version || null }),
  });
  return handleResponse<InstallResult>(resp);
}

// ---------------------------------------------------------------------------
// Installed packages — list + uninstall
// ---------------------------------------------------------------------------
export interface InstalledPackage {
  id: number;
  package_id: number;
  package_name: string;
  package_display_name: string;
  version: string;
  installed_node_ids: string[];
  installed_node_db_ids: number[];
  node_count: number;
  install_summary: InstallResult | null;
  icon_url: string | null;
  created_at: string | null;
}

export async function listInstalled(): Promise<InstalledPackage[]> {
  const resp = await fetch(`${getExtensionsHubBase()}/installed`, {
    headers: authHeaders(),
  });
  return handleResponse<InstalledPackage[]>(resp);
}

export async function uninstallPackage(installId: number): Promise<{ success: boolean; message: string; deleted_nodes: number }> {
  const resp = await fetch(`${getExtensionsHubBase()}/installed/${installId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// Git file tree — browse all files in a published package's repo
// ---------------------------------------------------------------------------
export interface GitTreeEntry {
  path: string;
  size: number;
  is_binary: boolean;
}

export interface GitFileContent {
  path: string;
  content: string;
  is_binary: boolean;
}

export async function getTree(packageId: number, ref?: string): Promise<GitTreeEntry[]> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/tree${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<GitTreeEntry[]>(resp);
}

export async function getFileByPath(packageId: number, path: string, ref?: string): Promise<GitFileContent> {
  const params = new URLSearchParams({ path });
  if (ref) params.set('ref', ref);
  const resp = await fetch(`${getExtensionsHubBase()}/packages/${packageId}/file?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<GitFileContent>(resp);
}
