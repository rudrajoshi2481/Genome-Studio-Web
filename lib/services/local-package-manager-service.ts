/**
 * Local Package Manager Service — typed fetch wrappers for /api/v1/local-packages/*
 *
 * This is the "local machine" service. Packages are stored locally in the
 * Genome Studio backend as git repos. Every edit creates a git commit.
 * On publish, the local repo is pushed to the Extension Hub (like git push to GitHub).
 *
 * Types are re-exported from the hub service since they share the same shapes.
 */
import { getApiBaseUrl } from '@/config/server';
import { getToken } from '@/lib/services/auth-service';
import { getHubToken } from '@/lib/services/hub-auth-service';
import {
  Package as PackageType,
  PackageDetail,
  PackageNode,
  PackageFile,
  PackageNodeIO,
  PackageVersion,
  ValidationResult,
  InstallResult,
  InstalledPackage,
} from '@/lib/services/package-manager-service';

// Re-export types for convenience
export type Package = PackageType;
export type { PackageDetail, PackageNode, PackageFile, PackageNodeIO, PackageVersion, ValidationResult };

// Evaluate at call time for correct dynamic port in Electron mode
function getLocalPackagesBase(): string {
  return `${getApiBaseUrl()}/local-packages`;
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
    // Read the body once as text, then try to parse as JSON.
    // Reading .json() then falling back to .text() throws "body stream already read".
    const text = await resp.text();
    let detail: any;
    try {
      detail = JSON.parse(text);
    } catch {
      detail = { detail: text };
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
export async function listLocalPackages(params?: { q?: string; tag?: string; skip?: number; limit?: number }): Promise<Package[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.skip) query.set('skip', String(params.skip));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const resp = await fetch(`${getLocalPackagesBase()}/packages${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<Package[]>(resp);
}

export async function getLocalPackage(packageId: number): Promise<PackageDetail> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function createLocalPackage(data: {
  name: string;
  display_name: string;
  description?: string;
  description_md?: string;
  author?: string;
  tags?: string[];
  license?: string;
  visibility?: string;
}): Promise<PackageDetail> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function updateLocalPackage(packageId: number, data: Partial<{
  display_name: string;
  description: string;
  description_md: string;
  author: string;
  tags: string[];
  license: string;
  visibility: string;
}>): Promise<PackageDetail> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<PackageDetail>(resp);
}

export async function deleteLocalPackage(packageId: number): Promise<{ success: boolean; message: string }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------
export async function uploadLocalPackageIcon(packageId: number, file: File): Promise<{ success: boolean; icon_url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/icon`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(resp);
}

export async function deleteLocalPackageIcon(packageId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/icon`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export function getLocalPackageIconUrl(packageId: number): string {
  return `${getLocalPackagesBase()}/packages/${packageId}/icon`;
}

// ---------------------------------------------------------------------------
// Version management
// ---------------------------------------------------------------------------
export async function listLocalVersions(packageId: number): Promise<PackageVersion[]> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/versions`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageVersion[]>(resp);
}

// ---------------------------------------------------------------------------
// Node CRUD
// ---------------------------------------------------------------------------
export async function listLocalNodes(packageId: number): Promise<PackageNode[]> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes`, {
    headers: authHeaders(),
  });
  return handleResponse<PackageNode[]>(resp);
}

export async function createLocalNode(
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
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, validate: data.validate ?? true }),
  });
  return handleResponse<PackageNode>(resp);
}

export async function updateLocalNode(
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
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, validate: data.validate ?? true }),
  });
  return handleResponse<PackageNode>(resp);
}

export async function deleteLocalNode(packageId: number, nodeId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// File upload/download
// ---------------------------------------------------------------------------
export async function uploadLocalFile(packageId: number, file: File, fileType: string = 'other'): Promise<PackageFile> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse<PackageFile>(resp);
}

export async function deleteLocalFile(packageId: number, fileId: number): Promise<{ success: boolean }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export function getLocalFileDownloadUrl(packageId: number, fileId: number): string {
  return `${getLocalPackagesBase()}/packages/${packageId}/files/${fileId}`;
}

// ---------------------------------------------------------------------------
// install.sh
// ---------------------------------------------------------------------------
export async function getLocalInstallSh(packageId: number, version?: string): Promise<{ content: string; file_id: number | null }> {
  const url = new URL(`${getLocalPackagesBase()}/packages/${packageId}/install.sh`, window.location.origin);
  if (version) url.searchParams.set('version', version);
  const resp = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export async function updateLocalInstallSh(packageId: number, content: string): Promise<{ content: string; file_id: number }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/install.sh`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// README.md — stored as README.md in the git tree
// ---------------------------------------------------------------------------
export async function getLocalReadme(packageId: number, ref?: string): Promise<{ content: string }> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/readme${params}`, {
    headers: authHeaders(),
  });
  return handleResponse(resp);
}

export async function updateLocalReadme(packageId: number, content: string): Promise<{ content: string }> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/readme`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse(resp);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export async function validateLocalNode(code: string, language: string = 'python'): Promise<ValidationResult> {
  const resp = await fetch(`${getLocalPackagesBase()}/validate-node`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, language }),
  });
  return handleResponse<ValidationResult>(resp);
}

// ---------------------------------------------------------------------------
// Git history, diff, revert
// ---------------------------------------------------------------------------
export interface CommitInfo {
  sha: string;
  message: string;
  author_name: string;
  author_email: string;
  time: string;
  files_changed: string[];
}

export async function getLocalHistory(packageId: number, path?: string, maxEntries?: number): Promise<CommitInfo[]> {
  const query = new URLSearchParams();
  if (path) query.set('path', path);
  if (maxEntries) query.set('max_entries', String(maxEntries));
  const qs = query.toString();
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/history${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<CommitInfo[]>(resp);
}

export async function getLocalNodeHistory(packageId: number, nodeId: number, maxEntries?: number): Promise<CommitInfo[]> {
  const query = new URLSearchParams();
  if (maxEntries) query.set('max_entries', String(maxEntries));
  const qs = query.toString();
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes/${nodeId}/history${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<CommitInfo[]>(resp);
}

export interface DiffEntry {
  path: string;
  old_path: string | null;
  status: string;
  old_content: string;
  new_content: string;
}

export async function getLocalDiff(packageId: number, refA: string, refB: string): Promise<DiffEntry[]> {
  const query = new URLSearchParams({ ref_a: refA, ref_b: refB });
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/diff?${query}`, {
    headers: authHeaders(),
  });
  return handleResponse<DiffEntry[]>(resp);
}

export async function revertLocalNode(packageId: number, nodeId: number, toRef: string): Promise<PackageNode> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/nodes/${nodeId}/revert`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to_ref: toRef }),
  });
  return handleResponse<PackageNode>(resp);
}

// ---------------------------------------------------------------------------
// PUBLISH — push local repo to the Extension Hub (like git push to GitHub)
// ---------------------------------------------------------------------------
export interface PublishResult {
  version: string;
  changelog: string;
  commit_sha: string;
  pushed: boolean;
  icon_pushed?: boolean;
  push_error?: string;
  push_output?: string;
  message: string;
}

export async function publishLocalPackage(packageId: number, version: string, changelog?: string): Promise<PublishResult> {
  // Include the Extension Hub auth token so the backend can authenticate
  // the push to the hub. The local backend reads this from the request
  // and forwards it (or uses it directly) when pushing via git smart HTTP.
  const hubToken = getHubToken();
  const headers = authHeaders();
  if (hubToken) {
    headers['X-Hub-Authorization'] = `Bearer ${hubToken}`;
  }
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version, changelog }),
  });
  return handleResponse<PublishResult>(resp);
}

// ---------------------------------------------------------------------------
// Install — install a local package's nodes into the Nodebar (no hub needed)
// ---------------------------------------------------------------------------
export async function installLocalPackage(packageId: number, version?: string): Promise<InstallResult> {
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/install`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ version: version || null }),
  });
  return handleResponse<InstallResult>(resp);
}

// ---------------------------------------------------------------------------
// Backup — download all local packages as a JSON file
// ---------------------------------------------------------------------------
export async function backupLocalPackages(): Promise<void> {
  // The local-packages router doesn't have a backup endpoint, but we can
  // fetch all packages and their details and construct a backup client-side.
  // For now, delegate to the hub's backup (which has all published packages).
  // A proper local backup would iterate all local packages and download details.
  const packages = await listLocalPackages();
  const details = await Promise.all(
    packages.map(p => getLocalPackage(p.id))
  );

  const exportData = {
    format: 'local-packages-backup',
    version: 1,
    exported_at: new Date().toISOString(),
    package_count: details.length,
    packages: details,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `local-packages-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Git file tree — browse all files in the repo
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

export async function getLocalTree(packageId: number, ref?: string): Promise<GitTreeEntry[]> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/tree${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<GitTreeEntry[]>(resp);
}

export async function getLocalFile(packageId: number, path: string, ref?: string): Promise<GitFileContent> {
  const params = new URLSearchParams({ path });
  if (ref) params.set('ref', ref);
  const resp = await fetch(`${getLocalPackagesBase()}/packages/${packageId}/file?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<GitFileContent>(resp);
}
