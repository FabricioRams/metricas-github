/**
 * Utilidades de calculo de metricas de Inteligencia de Negocios.
 * Logica de negocio central:
 * - Health Score (0-100)
 * - Metricas de equipo y deteccion de sobrecarga
 * - Metricas de Pull Requests
 * - Coeficiente de Gini (distribucion equitativa)
 * - Bus Factor
 */
import type {
  RepoData,
  Issue,
  PullRequest,
  ContributorStats,
  ContributorWeek,
  CommitActivity,
  CommunityProfile,
  HealthScore,
  TeamMemberMetrics,
  PRMetrics,
  Languages,
  IssueUser,
} from '../types';

// ─── HEALTH SCORE (0-100) ─────────────────────────────────────────────────

/**
 * Calcula el Health Score del repositorio.
 * Combina 5 dimensiones clave, cada una de 0 a 20 puntos:
 * Total: 0 - 100 puntos.
 */
export function calculateHealthScore(
  repo: RepoData,
  commitActivity: CommitActivity[],
  issues: Issue[],
  community: CommunityProfile | null,
  contributorStats: ContributorStats[]
): HealthScore {
  const activity = calcActivityScore(commitActivity);
  const issuesScore = calcIssuesScore(issues, repo.open_issues_count);
  const communityScore = calcCommunityScore(community, repo);
  const documentation = calcDocumentationScore(community, repo);
  const distribution = calcDistributionScore(contributorStats);

  return {
    total: Math.min(100, Math.round(activity + issuesScore + communityScore + documentation + distribution)),
    activity: Math.round(activity),
    issues: Math.round(issuesScore),
    community: Math.round(communityScore),
    documentation: Math.round(documentation),
    distribution: Math.round(distribution),
  };
}

/** Actividad reciente: commits en las ultimas semanas (0-20) */
function calcActivityScore(commitActivity: CommitActivity[]): number {
  if (!commitActivity.length) return 5;
  const last4Weeks = commitActivity.slice(-4);
  const totalRecent = last4Weeks.reduce((s: number, w: CommitActivity) => s + w.total, 0);
  const last12Weeks = commitActivity.slice(-12);
  const totalMedium = last12Weeks.reduce((s: number, w: CommitActivity) => s + w.total, 0);

  if (totalRecent >= 20) return 20;
  if (totalRecent >= 10) return 17;
  if (totalRecent >= 5) return 14;
  if (totalMedium >= 10) return 10;
  if (totalMedium >= 1) return 6;
  return 2;
}

/** Issues: ratio de cierre y eficiencia (0-20) */
function calcIssuesScore(issues: Issue[], openCount: number): number {
  if (issues.length === 0 && openCount === 0) return 16;
  const closed = issues.filter((i) => i.state === 'closed' && !i.pull_request).length;
  const open = issues.filter((i) => i.state === 'open' && !i.pull_request).length;
  const total = closed + open;
  if (total === 0) return 15;

  const closeRatio = closed / total;
  if (closeRatio >= 0.8) return 20;
  if (closeRatio >= 0.6) return 16;
  if (closeRatio >= 0.4) return 12;
  if (closeRatio >= 0.2) return 8;
  return 4;
}

/** Comunidad: popularidad y respaldo publico (0-20) */
function calcCommunityScore(_community: CommunityProfile | null, repo: RepoData): number {
  let score = 0;
  if (repo.stargazers_count >= 100) score += 8;
  else if (repo.stargazers_count >= 10) score += 5;
  else if (repo.stargazers_count >= 1) score += 2;

  if (repo.forks_count >= 50) score += 6;
  else if (repo.forks_count >= 5) score += 4;
  else if (repo.forks_count >= 1) score += 2;

  if (repo.watchers_count >= 20) score += 6;
  else if (repo.watchers_count >= 5) score += 4;
  else if (repo.watchers_count >= 1) score += 2;

  return Math.min(score, 20);
}

/** Documentacion: README, LICENSE, descripcion estructurada (0-20) */
function calcDocumentationScore(community: CommunityProfile | null, repo: RepoData): number {
  let score = 0;

  if (community && community.files) {
    if (community.files.readme) score += 6;
    if (community.files.license) score += 5;
    if (community.files.contributing) score += 4;
    if (community.files.code_of_conduct) score += 3;
  } else {
    if (repo.description) score += 5;
    if (repo.license) score += 6;
    if (repo.has_wiki) score += 3;
    score += 4; // README basico
  }

  if (repo.description && repo.description.length > 20) score += 2;

  return Math.min(score, 20);
}

/** Distribucion del trabajo entre colaboradores (0-20) */
function calcDistributionScore(contributorStats: ContributorStats[]): number {
  if (contributorStats.length <= 1) return 10;

  const commits = contributorStats.map((c) => c.total);
  const gini = calculateGini(commits);

  if (gini <= 0.2) return 20;
  if (gini <= 0.35) return 16;
  if (gini <= 0.5) return 12;
  if (gini <= 0.7) return 8;
  return 4;
}

// ─── METRICAS DE EQUIPO ───────────────────────────────────────────────────

/**
 * Genera metricas detalladas por cada colaborador con deteccion de sobrecarga.
 */
export function calculateTeamMetrics(
  contributorStats: ContributorStats[],
  issues: Issue[],
  pullRequests: PullRequest[]
): TeamMemberMetrics[] {
  return contributorStats.map((cs) => {
    const login = cs.author.login;

    // Issues asignadas abiertas y cerradas
    const assignedIssues = issues.filter(
      (i) => !i.pull_request && i.assignees && i.assignees.some((a: IssueUser) => a.login === login)
    );
    const issuesAssigned = assignedIssues.filter((i) => i.state === 'open').length;
    const issuesClosed = assignedIssues.filter((i) => i.state === 'closed').length;

    // PRs del usuario
    const userPRs = pullRequests.filter((pr) => pr.user && pr.user.login === login);
    const prsMerged = userPRs.filter((pr) => pr.merged_at).length;

    // Lineas anadidas/eliminadas
    const weeks = cs.weeks || [];
    const linesAdded = weeks.reduce((s: number, w: ContributorWeek) => s + w.a, 0);
    const linesDeleted = weeks.reduce((s: number, w: ContributorWeek) => s + w.d, 0);

    // Semanas activas
    const activeWeeks = weeks.filter((w: ContributorWeek) => w.c > 0).length;

    // Commits semanales para grafico (ultimas 12 semanas)
    const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    const weeklyCommits = weeks.slice(-12).map((w: ContributorWeek) => {
      const dStart = new Date(w.w * 1000);
      const dEnd = new Date((w.w + 6 * 86400) * 1000);
      const startDay = dStart.getUTCDate();
      const startMonth = MONTH_NAMES[dStart.getUTCMonth()];
      const endDay = dEnd.getUTCDate();
      const endMonth = MONTH_NAMES[dEnd.getUTCMonth()];
      const year = dEnd.getUTCFullYear();

      const week = `${startDay} ${startMonth}`;
      const dateRange =
        startMonth === endMonth
          ? `${startDay} - ${endDay} ${startMonth} ${year}`
          : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;

      return {
        week,
        dateRange,
        commits: w.c,
      };
    });

    // Indice de sobrecarga
    const pendingPRs = pullRequests.filter(
      (pr) => pr.state === 'open' && pr.requested_reviewers && pr.requested_reviewers.some((r: IssueUser) => r.login === login)
    ).length;
    const overloadIndex = Number(
      ((issuesAssigned >= 3 ? 1 : 0) + (pendingPRs >= 2 ? 0.5 : 0) + (issuesAssigned / 3)).toFixed(1)
    );

    return {
      login,
      avatar_url: cs.author.avatar_url,
      totalCommits: cs.total,
      linesAdded,
      linesDeleted,
      issuesAssigned,
      issuesClosed,
      prsCreated: userPRs.length,
      prsMerged,
      activeWeeks,
      totalWeeks: weeks.length,
      overloadIndex,
      weeklyCommits,
    };
  }).sort((a, b) => b.totalCommits - a.totalCommits);
}

// ─── METRICAS DE PULL REQUESTS ────────────────────────────────────────────

/**
 * Calcula metricas agregadas de Pull Requests.
 */
export function calculatePRMetrics(pullRequests: PullRequest[]): PRMetrics {
  const open = pullRequests.filter((pr) => pr.state === 'open');
  const merged = pullRequests.filter((pr) => Boolean(pr.merged_at));
  const rejected = pullRequests.filter((pr) => pr.state === 'closed' && !pr.merged_at);

  const mergeTimes = merged
    .filter((pr) => pr.created_at && pr.merged_at)
    .map((pr) => (new Date(pr.merged_at!).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60));

  const avgMergeTimeHours =
    mergeTimes.length > 0
      ? Math.round((mergeTimes.reduce((s: number, t: number) => s + t, 0) / mergeTimes.length) * 10) / 10
      : 0;

  const prsWithoutReviewers = open.filter((pr) => !pr.requested_reviewers || pr.requested_reviewers.length === 0).length;

  const oldestOpenPR =
    open.length > 0
      ? open.reduce((oldest, pr) =>
          new Date(pr.created_at).getTime() < new Date(oldest.created_at).getTime() ? pr : oldest
        )
      : null;

  const sizes = pullRequests
    .filter((pr) => pr.additions !== undefined && pr.deletions !== undefined)
    .map((pr) => (pr.additions || 0) + (pr.deletions || 0));

  const avgSize = sizes.length > 0 ? Math.round(sizes.reduce((s: number, v: number) => s + v, 0) / sizes.length) : 0;

  const prsByAuthor: Record<string, { created: number; merged: number }> = {};
  pullRequests.forEach((pr) => {
    if (!pr.user) return;
    const author = pr.user.login;
    if (!prsByAuthor[author]) prsByAuthor[author] = { created: 0, merged: 0 };
    prsByAuthor[author].created++;
    if (pr.merged_at) prsByAuthor[author].merged++;
  });

  return {
    totalOpen: open.length,
    totalMerged: merged.length,
    totalRejected: rejected.length,
    avgMergeTimeHours,
    prsWithoutReviewers,
    oldestOpenPR,
    avgSize,
    prsByAuthor,
  };
}

// ─── UTILIDADES GENERALES ─────────────────────────────────────────────────

/** Coeficiente de Gini para medir dispersion o desigualdad de contribuciones */
export function calculateGini(values: number[]): number {
  if (values.length <= 1) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;

  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return Number((sumDiff / (2 * n * n * mean)).toFixed(2));
}

/** Formatea numero grande: 1234 -> "1.2k" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Calcula porcentaje de distribucion de lenguajes */
export function languagePercentages(languages: Languages): { name: string; value: number; percentage: number }[] {
  const numericValues = Object.values(languages).map((v) => Number(v) || 0);
  const total = numericValues.reduce((s: number, v: number) => s + v, 0);
  if (total === 0) return [];

  return Object.entries(languages)
    .map(([name, value]) => {
      const num = Number(value) || 0;
      return {
        name,
        value: num,
        percentage: Math.round((num / total) * 100),
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Calcula dias desde la ultima actividad */
export function daysSinceLastActivity(pushedAt: string): number {
  if (!pushedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)));
}

/** Tiempo promedio de resolucion de issues en dias */
export function avgIssueResolutionDays(issues: Issue[]): number {
  const closed = issues.filter((i) => i.state === 'closed' && i.closed_at && !i.pull_request);
  if (closed.length === 0) return 0;
  const totalDays = closed.reduce((sum, issue) => {
    const created = new Date(issue.created_at).getTime();
    const closedAt = new Date(issue.closed_at!).getTime();
    return sum + (closedAt - created) / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round((totalDays / closed.length) * 10) / 10;
}

/** Bus Factor: numero minimo de desarrolladores que concentran >50% de los commits */
export function calculateBusFactor(contributorStats: ContributorStats[]): number {
  if (contributorStats.length === 0) return 0;
  const sorted = [...contributorStats].sort((a, b) => b.total - a.total);
  const totalCommits = sorted.reduce((s, c) => s + c.total, 0);
  if (totalCommits === 0) return 0;

  let accum = 0;
  let count = 0;
  for (const c of sorted) {
    accum += c.total;
    count++;
    if (accum > totalCommits * 0.5) break;
  }
  return count;
}
