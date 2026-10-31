/**
 * Servicio centralizado para comunicación con la API REST de GitHub v3.
 * Maneja llamadas en paralelo, tokens de autenticación y fallbacks resilientes.
 */
import type {
  FullRepoData,
  RepoData,
  CommitActivity,
  Issue,
  ContributorStats,
  CommunityProfile,
  CodeFrequencyPoint,
  Languages,
  PullRequest,
  Milestone,
} from '../types';

export type { FullRepoData };

const BASE_URL = 'https://api.github.com';

function getHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Realiza una petición GET segura con manejo de códigos 202 (GitHub computando stats)
 * y errores HTTP sin romper la aplicación.
 */
async function safeFetch<T>(url: string, headers: HeadersInit, defaultValue: T): Promise<T> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return defaultValue;
    }
    const data = await res.json();
    return data ?? defaultValue;
  } catch (err) {
    console.warn(`Error al consultar ${url}:`, err);
    return defaultValue;
  }
}

/**
 * Descarga el conjunto completo de datos analíticos para un repositorio dado.
 */
export async function fetchFullRepoData(
  fullName: string,
  token?: string | null
): Promise<FullRepoData | null> {
  const cleanName = fullName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  if (!cleanName.includes('/')) return null;

  const headers = getHeaders(token);

  // 1. Datos base del repositorio (obligatorio)
  const repoRes = await fetch(`${BASE_URL}/repos/${cleanName}`, { headers });
  if (!repoRes.ok) {
    console.error(`Repositorio no encontrado o sin acceso: ${cleanName}`);
    return null;
  }
  const repo: RepoData = await repoRes.json();

  // 2. Consultas secundarias en paralelo
  const [
    commitActivityRes,
    issuesRes,
    contributorStatsRes,
    communityRes,
    codeFreqRaw,
    languagesRes,
    pullRequestsRes,
    milestonesRes,
  ] = await Promise.all([
    safeFetch<CommitActivity[]>(`${BASE_URL}/repos/${cleanName}/stats/commit_activity`, headers, []),
    safeFetch<Issue[]>(`${BASE_URL}/repos/${cleanName}/issues?state=all&per_page=100`, headers, []),
    safeFetch<ContributorStats[]>(`${BASE_URL}/repos/${cleanName}/stats/contributors`, headers, []),
    safeFetch<CommunityProfile | null>(`${BASE_URL}/repos/${cleanName}/community/profile`, headers, null),
    safeFetch<[number, number, number][]>(`${BASE_URL}/repos/${cleanName}/stats/code_frequency`, headers, []),
    safeFetch<Languages>(`${BASE_URL}/repos/${cleanName}/languages`, headers, {}),
    safeFetch<PullRequest[]>(`${BASE_URL}/repos/${cleanName}/pulls?state=all&per_page=100`, headers, []),
    safeFetch<Milestone[]>(`${BASE_URL}/repos/${cleanName}/milestones?state=all`, headers, []),
  ]);

  // Si contributorStats está vacío (a veces GitHub tarda en computarlo con 202),
  // intentamos un fallback a /contributors para tener al menos lista de autores y totales
  let contributorStats = Array.isArray(contributorStatsRes) ? contributorStatsRes : [];
  if (contributorStats.length === 0) {
    const basicContributors = await safeFetch<any[]>(`${BASE_URL}/repos/${cleanName}/contributors?per_page=30`, headers, []);
    if (Array.isArray(basicContributors) && basicContributors.length > 0) {
      contributorStats = basicContributors.map((c) => ({
        author: {
          login: c.login,
          avatar_url: c.avatar_url,
          html_url: c.html_url,
        },
        total: c.contributions || 0,
        weeks: [],
      }));
    }
  }

  // Normalizar codeFrequency a objetos legibles
  const codeFrequency: CodeFrequencyPoint[] = Array.isArray(codeFreqRaw)
    ? codeFreqRaw.map(([week, additions, deletions]) => ({
        week,
        additions,
        deletions,
      }))
    : [];

  const commitActivity = Array.isArray(commitActivityRes) ? commitActivityRes : [];
  const issues = Array.isArray(issuesRes) ? issuesRes : [];
  const pullRequests = Array.isArray(pullRequestsRes) ? pullRequestsRes : [];
  const milestones = Array.isArray(milestonesRes) ? milestonesRes : [];

  return {
    repo,
    commitActivity,
    issues,
    contributorStats,
    community: communityRes,
    codeFrequency,
    languages: languagesRes || {},
    pullRequests,
    milestones,
  };
}

/**
 * Obtiene los repositorios del usuario autenticado (hasta 100 por pagina).
 */
export async function fetchUserRepos(token: string): Promise<any[]> {
  const headers = getHeaders(token);
  return safeFetch<any[]>(`${BASE_URL}/user/repos?sort=updated&per_page=100`, headers, []);
}

/**
 * Repositorios populares predefinidos para pruebas inmediatas y benchmarking.
 */
export const FEATURED_REPOSITORIES: {
  full_name: string;
  name: string;
  owner: string;
  language: string;
  description: string;
  category: 'web' | 'tools' | 'languages';
}[] = [
  {
    full_name: 'facebook/react',
    name: 'react',
    owner: 'facebook',
    language: 'JavaScript',
    description: 'La biblioteca de JavaScript para crear interfaces de usuario web y nativas.',
    category: 'web',
  },
  {
    full_name: 'vuejs/core',
    name: 'core (vue)',
    owner: 'vuejs',
    language: 'TypeScript',
    description: 'Framework progresivo de JavaScript para construir interfaces interactivas.',
    category: 'web',
  },
  {
    full_name: 'angular/angular',
    name: 'angular',
    owner: 'angular',
    language: 'TypeScript',
    description: 'Plataforma para construir aplicaciones web móviles y de escritorio.',
    category: 'web',
  },
  {
    full_name: 'vercel/next.js',
    name: 'next.js',
    owner: 'vercel',
    language: 'JavaScript',
    description: 'El framework de React para aplicaciones web modernas listas para producción.',
    category: 'web',
  },
  {
    full_name: 'tailwindlabs/tailwindcss',
    name: 'tailwindcss',
    owner: 'tailwindlabs',
    language: 'TypeScript',
    description: 'Un framework CSS centrado en utilidades para prototipado y diseño rápido.',
    category: 'web',
  },
  {
    full_name: 'microsoft/vscode',
    name: 'vscode',
    owner: 'microsoft',
    language: 'TypeScript',
    description: 'Editor de código fuente multiplataforma y extensible desarrollado por Microsoft.',
    category: 'tools',
  },
  {
    full_name: 'torvalds/linux',
    name: 'linux',
    owner: 'torvalds',
    language: 'C',
    description: 'Árbol del código fuente del kernel de Linux de Linus Torvalds.',
    category: 'tools',
  },
  {
    full_name: 'golang/go',
    name: 'go',
    owner: 'golang',
    language: 'Go',
    description: 'El lenguaje de programación de código abierto Go de Google.',
    category: 'languages',
  },
  {
    full_name: 'python/cpython',
    name: 'cpython',
    owner: 'python',
    language: 'Python',
    description: 'La implementación de referencia del lenguaje de programación Python en C.',
    category: 'languages',
  },
];

/**
 * Busca repositorios similares en GitHub por lenguaje y rango de estrellas (para Benchmarking).
 */
export async function searchSimilarRepos(
  language: string,
  targetStars: number,
  token?: string | null
): Promise<RepoData[]> {
  const headers = getHeaders(token);
  const minStars = Math.max(0, Math.floor(targetStars * 0.4));
  const maxStars = Math.ceil(targetStars * 2.5);
  const query = `language:${encodeURIComponent(language)} stars:${minStars}..${maxStars}`;

  const res = await safeFetch<{ items?: RepoData[] }>(
    `${BASE_URL}/search/repositories?q=${query}&sort=stars&order=desc&per_page=12`,
    headers,
    { items: [] }
  );

  return res.items || [];
}
