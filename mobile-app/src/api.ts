import {
  Workspace, WorkspaceStatus, DiffResult, ApiSuccess,
  BranchListResult, LogResult, StashListResult
} from './types';

const TIMEOUT_MS = 30000;

async function apiCall<T>(
  targetIp: string,
  authToken: string,
  method: string,
  path: string,
  body: any = null
): Promise<T> {
  const url = `http://${targetIp}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    clearTimeout(id);
    throw err;
  }
}

export function pair(ip: string, code: string) {
  return apiCall<{ token: string }>(ip, '', 'POST', '/api/pair', { code });
}

export function fetchWorkspaces(ip: string, token: string) {
  return apiCall<Workspace[]>(ip, token, 'GET', '/api/workspaces');
}

export function fetchStatus(ip: string, token: string, workspaceId: string) {
  return apiCall<WorkspaceStatus>(ip, token, 'GET', `/api/workspaces/${workspaceId}/status`);
}

export function fetchDiff(ip: string, token: string, workspaceId: string, file: string, staged: boolean) {
  return apiCall<DiffResult>(
    ip, token, 'GET',
    `/api/workspaces/${workspaceId}/diff?file=${encodeURIComponent(file)}&staged=${staged}`
  );
}

export function stageFiles(ip: string, token: string, workspaceId: string, files: string[], stage: boolean) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/stage`, { files, stage });
}

export function commit(ip: string, token: string, workspaceId: string, message: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/commit`, { message });
}

export function push(ip: string, token: string, workspaceId: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/push`);
}

export function pull(ip: string, token: string, workspaceId: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/pull`);
}

export function fetchRemote(ip: string, token: string, workspaceId: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/fetch`);
}

export function fetchBranches(ip: string, token: string, workspaceId: string) {
  return apiCall<BranchListResult>(ip, token, 'GET', `/api/workspaces/${workspaceId}/branches`);
}

export function checkoutBranch(ip: string, token: string, workspaceId: string, branch: string, create = false) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/branches/checkout`, { branch, create });
}

export function deleteBranch(ip: string, token: string, workspaceId: string, branch: string) {
  return apiCall<ApiSuccess>(ip, token, 'DELETE', `/api/workspaces/${workspaceId}/branches/${encodeURIComponent(branch)}`);
}

export function fetchLog(ip: string, token: string, workspaceId: string, count = 20, branch?: string) {
  let url = `/api/workspaces/${workspaceId}/log?count=${count}`;
  if (branch) url += `&branch=${encodeURIComponent(branch)}`;
  return apiCall<LogResult>(ip, token, 'GET', url);
}

export function fetchStashList(ip: string, token: string, workspaceId: string) {
  return apiCall<StashListResult>(ip, token, 'GET', `/api/workspaces/${workspaceId}/stash`);
}

export function saveStash(ip: string, token: string, workspaceId: string, message?: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/stash`, { message });
}

export function popStash(ip: string, token: string, workspaceId: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/stash/pop`);
}

export function dropStash(ip: string, token: string, workspaceId: string) {
  return apiCall<ApiSuccess>(ip, token, 'POST', `/api/workspaces/${workspaceId}/stash/drop`);
}
