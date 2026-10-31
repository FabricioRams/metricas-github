/**
 * Definiciones de tipos para DevMetrics BI Solutions.
 * Modelado estricto para GitHub REST API y métricas de inteligencia de negocios.
 */

export interface RepoOwner {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface RepoLicense {
  key: string;
  name: string;
  spdx_id?: string;
  url?: string;
}

export interface RepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  html_url: string;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  size: number;
  license?: RepoLicense | null;
  has_wiki?: boolean;
  owner: RepoOwner;
  topics?: string[];
}

export interface IssueUser {
  login: string;
  avatar_url: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  pull_request?: Record<string, unknown>;
  assignees: IssueUser[];
  user: IssueUser;
  html_url: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: IssueUser;
  requested_reviewers: IssueUser[];
  additions?: number;
  deletions?: number;
  html_url: string;
}

export interface ContributorWeek {
  w: number; // Unix timestamp
  a: number; // additions
  d: number; // deletions
  c: number; // commits
}

export interface ContributorStats {
  author: RepoOwner;
  total: number;
  weeks: ContributorWeek[];
}

export interface CommitActivity {
  total: number;
  week: number;
  days: number[];
}

export interface CommunityProfileFiles {
  readme?: Record<string, unknown> | null;
  license?: Record<string, unknown> | null;
  contributing?: Record<string, unknown> | null;
  code_of_conduct?: Record<string, unknown> | null;
}

export interface CommunityProfile {
  health_percentage?: number;
  description?: string | null;
  documentation?: string | null;
  files: CommunityProfileFiles;
}

export interface Milestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  open_issues: number;
  closed_issues: number;
  created_at: string;
  due_on: string | null;
  closed_at: string | null;
  html_url: string;
}

export type Languages = Record<string, number>;

export interface CodeFrequencyPoint {
  week: number;
  additions: number;
  deletions: number;
}

export interface FullRepoData {
  repo: RepoData;
  commitActivity: CommitActivity[];
  issues: Issue[];
  contributorStats: ContributorStats[];
  community: CommunityProfile | null;
  codeFrequency: CodeFrequencyPoint[];
  languages: Languages;
  pullRequests: PullRequest[];
  milestones: Milestone[];
}

export interface HealthScore {
  total: number;
  activity: number;
  issues: number;
  community: number;
  documentation: number;
  distribution: number;
}

export interface TeamMemberMetrics {
  login: string;
  avatar_url: string;
  totalCommits: number;
  linesAdded: number;
  linesDeleted: number;
  issuesAssigned: number;
  issuesClosed: number;
  prsCreated: number;
  prsMerged: number;
  activeWeeks: number;
  totalWeeks: number;
  overloadIndex: number;
  weeklyCommits: { week: string; dateRange: string; commits: number }[];
}

export interface PRMetrics {
  totalOpen: number;
  totalMerged: number;
  totalRejected: number;
  avgMergeTimeHours: number;
  prsWithoutReviewers: number;
  oldestOpenPR: PullRequest | null;
  avgSize: number;
  prsByAuthor: Record<string, { created: number; merged: number }>;
}
