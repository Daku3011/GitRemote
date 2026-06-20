export type ConnectionMode = 'pc' | 'github';

export type Screen =
  | 'connect'
  | 'workspaces'
  | 'detail'
  | 'github-repos'
  | 'github-tree'
  | 'github-file'
  | 'branches'
  | 'log'
  | 'stash';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  currentBranch: string;
  changesCount: number;
  error?: string;
}

export type FileStatusType = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';

export interface FileEntry {
  path: string;
  status: FileStatusType;
  staged: boolean;
}

export interface WorkspaceStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: FileEntry[];
}

export interface DiffResult {
  file: string;
  diff: string;
}

export interface BranchInfo {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

export interface BranchListResult {
  branches: BranchInfo[];
  current: string;
}

export interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
  refs: string;
}

export interface LogResult {
  total: number;
  latest: any;
  commits: CommitInfo[];
}

export interface StashInfo {
  hash: string;
  date: string;
  message: string;
}

export interface StashListResult {
  stashes: StashInfo[];
}

export interface ApiSuccess {
  success: boolean;
  summary?: any;
  output?: any;
}
