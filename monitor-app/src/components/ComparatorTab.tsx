/**
 * ComparatorTab — Comparador de Repositorios y Benchmarking Avanzado de Inteligencia de Negocios.
 * Analisis multidimensional de salud (8 ejes), curvas de ritmo temporal (52 semanas),
 * metricas operativas DevOps/DORA, composicion tecnologica y matriz detallada.
 * Sin emojis y sin Power BI.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  X,
  Trophy,
  ArrowUpDown,
  Loader,
  Shield,
  Sparkles,
  Check,
  Filter,
  Layers,
  Star,
  TrendingUp,
  Zap,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Globe,
  GitPullRequest,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  fetchFullRepoData,
  searchSimilarRepos,
  FEATURED_REPOSITORIES,
  type FullRepoData,
} from '../services/github';
import type { RepoData } from '../types';
import {
  calculateHealthScore,
  calculateBusFactor,
  calculateGini,
  calculatePRMetrics,
  avgIssueResolutionDays,
  daysSinceLastActivity,
  formatNumber,
} from '../utils/metrics';

interface Props {
  token: string | null;
  currentRepo?: FullRepoData | null;
  myRepos?: any[];
}

interface ComparedItem {
  id: string;
  data: FullRepoData;
  healthScore: number;
}

interface SuggestionCard {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stars?: number;
  forks?: number;
  source: 'mine' | 'similar' | 'featured';
}

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#f0883e', '#f85149'];

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Dart: '#00B4AB',
};

const RADAR_AXES = [
  { key: 'prVelocity', label: 'Velocidad PRs', desc: 'Rapidez de integración y merge' },
  { key: 'issueResolution', label: 'Resolución Issues', desc: 'Capacidad de respuesta a incidencias' },
  { key: 'momentum', label: 'Ritmo Reciente', desc: 'Consistencia de commits en últimas 12 semanas' },
  { key: 'busFactorScore', label: 'Bus Factor', desc: 'Resiliencia ante dependencia de pocas personas' },
  { key: 'reviewCulture', label: 'Cultura Review', desc: 'Porcentaje de PRs con revisión formal' },
  { key: 'documentation', label: 'Gobernanza y Doc', desc: 'README, guías, normas y plantillas' },
  { key: 'giniEquity', label: 'Equidad de Carga', desc: 'Distribución balanceada del esfuerzo técnico' },
  { key: 'community', label: 'Comunidad', desc: 'Tracción social, estrellas y adopción' },
];

function computeRepoAdvancedMetrics(data: FullRepoData) {
  const { repo, commitActivity, issues, contributorStats, community, languages, pullRequests } = data;

  // PR Metrics
  const prMetrics = calculatePRMetrics(pullRequests || []);
  const avgHours = prMetrics.avgMergeTimeHours;
  let prVelocityScore = 50;
  if (prMetrics.totalMerged > 0) {
    if (avgHours <= 12) prVelocityScore = Math.round(95 + ((12 - avgHours) / 12) * 5);
    else if (avgHours <= 48) prVelocityScore = Math.round(75 + ((48 - avgHours) / 36) * 20);
    else if (avgHours <= 168) prVelocityScore = Math.round(50 + ((168 - avgHours) / 120) * 25);
    else prVelocityScore = Math.max(20, Math.round(50 - ((avgHours - 168) / 300) * 30));
  } else if ((pullRequests || []).length === 0) {
    prVelocityScore = 60;
  } else {
    prVelocityScore = 30;
  }

  // Issues resolution rate
  const nonPrIssues = (issues || []).filter((i) => !i.pull_request);
  const closedIssues = nonPrIssues.filter((i) => i.state === 'closed').length;
  const openIssues = nonPrIssues.filter((i) => i.state === 'open').length;
  const totalIssues = closedIssues + openIssues;
  const issueResolutionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 75;
  const issueResolutionScore = issueResolutionRate;

  // Recent momentum (last 12 weeks commits)
  const last12Weeks = (commitActivity || []).slice(-12);
  const recentCommits12w = last12Weeks.reduce((s, w) => s + w.total, 0);
  let recentMomentumScore = 20;
  if (recentCommits12w >= 200) recentMomentumScore = 100;
  else if (recentCommits12w >= 100) recentMomentumScore = Math.round(85 + ((recentCommits12w - 100) / 100) * 15);
  else if (recentCommits12w >= 30) recentMomentumScore = Math.round(65 + ((recentCommits12w - 30) / 70) * 20);
  else if (recentCommits12w >= 5) recentMomentumScore = Math.round(40 + ((recentCommits12w - 5) / 25) * 25);
  else if (recentCommits12w > 0) recentMomentumScore = 25;
  else recentMomentumScore = 10;

  // Bus factor
  const busFactor = calculateBusFactor(contributorStats || []);
  let busFactorScore = 20;
  if (busFactor >= 7) busFactorScore = 100;
  else if (busFactor >= 5) busFactorScore = Math.round(85 + (busFactor - 5) * 7.5);
  else if (busFactor === 4) busFactorScore = 75;
  else if (busFactor === 3) busFactorScore = 60;
  else if (busFactor === 2) busFactorScore = 45;
  else busFactorScore = 25;

  // Review culture
  const totalPRs = (pullRequests || []).length;
  const reviewedPRs = (pullRequests || []).filter(
    (p) => (p.requested_reviewers?.length || 0) > 0
  ).length;
  const reviewCoveragePercent = totalPRs > 0 ? Math.round((reviewedPRs / totalPRs) * 100) : 50;
  const reviewCultureScore = Math.min(100, Math.max(20, reviewCoveragePercent));

  // Documentation
  let docScore = 0;
  if (community?.files?.readme) docScore += 30;
  if (community?.files?.license) docScore += 30;
  if (community?.files?.contributing) docScore += 20;
  if (community?.files?.code_of_conduct) docScore += 15;
  if (community?.documentation || (repo.description && repo.description.length > 20)) docScore += 5;
  const documentationScore = Math.min(100, docScore || (repo.description ? 40 : 20));

  // Gini equity
  const commitsArr = (contributorStats || []).map((c) => c.total);
  const gini = calculateGini(commitsArr);
  const giniEquityScore = Math.min(100, Math.max(10, Math.round((1 - gini) * 100)));

  // Community adoption
  const stars = repo.stargazers_count || 0;
  let communityScore = 20;
  if (stars >= 20000) communityScore = 100;
  else if (stars >= 5000) communityScore = Math.round(85 + ((stars - 5000) / 15000) * 15);
  else if (stars >= 1000) communityScore = Math.round(70 + ((stars - 1000) / 4000) * 15);
  else if (stars >= 200) communityScore = Math.round(50 + ((stars - 200) / 800) * 20);
  else if (stars >= 30) communityScore = 35;

  // Total commits
  const totalCommits = (contributorStats || []).reduce((s, c) => s + c.total, 0);

  // Average issue resolution days
  const avgIssueDays = avgIssueResolutionDays(issues || []);

  // Days since last activity
  const daysSincePush = daysSinceLastActivity(repo.pushed_at);

  // Languages breakdown
  const langObj = languages || {};
  const totalLangBytes = Object.values(langObj).reduce((a, b) => a + b, 0);
  const languagesBreakdown = Object.entries(langObj)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: totalLangBytes > 0 ? Math.round((bytes / totalLangBytes) * 100) : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  return {
    prVelocity: prVelocityScore,
    issueResolution: issueResolutionScore,
    momentum: recentMomentumScore,
    busFactorScore,
    reviewCulture: reviewCultureScore,
    documentation: documentationScore,
    giniEquity: giniEquityScore,
    community: communityScore,

    // Raw metrics
    avgMergeHours: Math.round(avgHours * 10) / 10,
    openPRsCount: prMetrics.totalOpen,
    mergedPRsCount: prMetrics.totalMerged,
    openIssuesCount: openIssues,
    closedIssuesCount: closedIssues,
    issueResolutionRate,
    avgIssueDays,
    daysSincePush,
    recentCommits12w,
    totalCommits,
    busFactor,
    gini: Math.round(gini * 100) / 100,
    reviewCoveragePercent,
    languagesBreakdown,
  };
}

export default function ComparatorTab({ token, currentRepo, myRepos = [] }: Props) {
  const [repoInput, setRepoInput] = useState('');
  const [repos, setRepos] = useState<ComparedItem[]>(() => {
    if (currentRepo) {
      const hs = calculateHealthScore(
        currentRepo.repo,
        currentRepo.commitActivity,
        currentRepo.issues,
        currentRepo.community,
        currentRepo.contributorStats
      );
      return [{ id: currentRepo.repo.full_name, data: currentRepo, healthScore: hs.total }];
    }
    return [];
  });
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [error, setError] = useState('');

  // ── Modos de visualizacion ordenada ──
  const [viewMode, setViewMode] = useState<'all' | 'summary' | 'timeline' | 'efficiency' | 'matrix'>('all');
  const [showCatalog, setShowCatalog] = useState(false);

  // ── Filtros del Catalogo de Recomendaciones ──
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'mine' | 'similar' | 'featured'>(
    myRepos.length > 0 ? 'mine' : 'featured'
  );
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLanguage, setCatalogLanguage] = useState<string>('all');
  const [similarRepos, setSimilarRepos] = useState<RepoData[]>([]);

  // Buscar repositorios similares automaticamente si hay repo actual
  useEffect(() => {
    let isMounted = true;
    if (currentRepo?.repo.language) {
      searchSimilarRepos(
        currentRepo.repo.language,
        currentRepo.repo.stargazers_count,
        token
      ).then((items) => {
        if (isMounted) {
          setSimilarRepos(items);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentRepo, token]);

  const addRepoByQuery = async (query: string) => {
    let cleanQuery = query.trim();
    if (!cleanQuery) return;

    if (cleanQuery.includes('github.com/')) {
      const parts = cleanQuery.split('github.com/')[1].split('/');
      if (parts.length >= 2) cleanQuery = `${parts[0]}/${parts[1].replace('.git', '')}`;
    }

    if (!cleanQuery.includes('/')) {
      setError('Formato invalido. Utiliza: propietario/repositorio (ej. facebook/react)');
      return;
    }

    if (repos.some((r) => r.id.toLowerCase() === cleanQuery.toLowerCase())) {
      setError('Este repositorio ya se encuentra en la comparacion.');
      return;
    }

    if (repos.length >= 5) {
      setError('Limite maximo alcanzado: 5 repositorios para comparar simultaneamente.');
      return;
    }

    setLoadingAdd(true);
    setError('');

    const data = await fetchFullRepoData(cleanQuery, token);
    if (!data) {
      setError(`No se pudo cargar "${cleanQuery}". Verifica que sea publico o inicia sesion.`);
      setLoadingAdd(false);
      return;
    }

    const hs = calculateHealthScore(
      data.repo,
      data.commitActivity,
      data.issues,
      data.community,
      data.contributorStats
    );

    setRepos((prev) => [...prev, { id: data.repo.full_name, data, healthScore: hs.total }]);
    setRepoInput('');
    setLoadingAdd(false);
  };

  const removeRepo = (id: string) => {
    setRepos((prev) => prev.filter((r) => r.id !== id));
  };

  // Metricas avanzadas calculadas para cada repositorio
  const advancedMetrics = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeRepoAdvancedMetrics>> = {};
    repos.forEach((r) => {
      map[r.id] = computeRepoAdvancedMetrics(r.data);
    });
    return map;
  }, [repos]);

  // Veredicto de Benchmarking
  const verdict = useMemo(() => {
    if (repos.length < 2) return null;

    // 1. Ritmo reciente (ultimas 12 semanas)
    const leaderMomentum = [...repos].sort(
      (a, b) => (advancedMetrics[b.id]?.recentCommits12w || 0) - (advancedMetrics[a.id]?.recentCommits12w || 0)
    )[0];

    // 2. PR Velocity (menor tiempo promedio entre los que tienen PRs)
    const reposWithMerged = repos.filter((r) => (advancedMetrics[r.id]?.mergedPRsCount || 0) > 0);
    const leaderPR = reposWithMerged.length > 0
      ? [...reposWithMerged].sort(
          (a, b) => (advancedMetrics[a.id]?.avgMergeHours || 9999) - (advancedMetrics[b.id]?.avgMergeHours || 9999)
        )[0]
      : repos[0];

    // 3. Resiliencia de equipo (Bus Factor)
    const leaderBusFactor = [...repos].sort(
      (a, b) => (advancedMetrics[b.id]?.busFactor || 0) - (advancedMetrics[a.id]?.busFactor || 0)
    )[0];

    // 4. Soporte e incidencias
    const leaderIssues = [...repos].sort(
      (a, b) => (advancedMetrics[b.id]?.issueResolutionRate || 0) - (advancedMetrics[a.id]?.issueResolutionRate || 0)
    )[0];

    // 5. Tracción comunitaria
    const leaderCommunity = [...repos].sort(
      (a, b) => (b.data.repo.stargazers_count || 0) - (a.data.repo.stargazers_count || 0)
    )[0];

    return {
      leaderMomentum,
      leaderPR,
      leaderBusFactor,
      leaderIssues,
      leaderCommunity,
    };
  }, [repos, advancedMetrics]);

  // Datos para radar de 8 ejes (0 a 100)
  const radarCompareData = useMemo(() => {
    if (repos.length < 2) return [];
    return RADAR_AXES.map((axis) => {
      const row: Record<string, string | number> = {
        metric: axis.label,
      };
      repos.forEach((r) => {
        row[r.data.repo.name] = (advancedMetrics[r.id] as any)?.[axis.key] || 0;
      });
      return row;
    });
  }, [repos, advancedMetrics]);

  // Datos de ritmo temporal en 52 semanas
  const timelineData = useMemo(() => {
    if (repos.length < 2) return [];
    const sampleActivity = repos.find((r) => (r.data.commitActivity?.length || 0) > 0)?.data.commitActivity || [];
    if (sampleActivity.length === 0) return [];

    const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    return sampleActivity.map((samplePoint, index) => {
      const d = new Date(samplePoint.week * 1000);
      const day = d.getUTCDate();
      const month = MONTHS[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      const weekLabel = `${day} ${month}`;
      const fullDate = `Semana del ${day} ${month} ${year}`;

      const point: Record<string, string | number> = {
        week: weekLabel,
        fullDate,
      };

      repos.forEach((r) => {
        const act = r.data.commitActivity || [];
        const offset = act.length - sampleActivity.length;
        const targetIdx = index + offset;
        const commits = targetIdx >= 0 && act[targetIdx] ? act[targetIdx].total : 0;
        point[r.data.repo.name] = commits;
      });

      return point;
    });
  }, [repos]);

  // Datos para grafico de barras de eficiencia de proceso
  const efficiencyData = useMemo(() => {
    if (repos.length < 2) return [];
    return [
      {
        metric: 'Resolución Issues (%)',
        ...Object.fromEntries(repos.map((r) => [r.data.repo.name, advancedMetrics[r.id]?.issueResolutionRate || 0])),
      },
      {
        metric: 'Cultura Review PRs (%)',
        ...Object.fromEntries(repos.map((r) => [r.data.repo.name, advancedMetrics[r.id]?.reviewCoveragePercent || 0])),
      },
      {
        metric: 'Equidad Gini (%)',
        ...Object.fromEntries(repos.map((r) => [r.data.repo.name, advancedMetrics[r.id]?.giniEquity || 0])),
      },
      {
        metric: 'Gobernanza Docs (%)',
        ...Object.fromEntries(repos.map((r) => [r.data.repo.name, advancedMetrics[r.id]?.documentation || 0])),
      },
    ];
  }, [repos, advancedMetrics]);

  // Sugerencias combinadas
  const consolidatedSuggestions = useMemo<SuggestionCard[]>(() => {
    const list: SuggestionCard[] = [];

    myRepos.forEach((r) => {
      list.push({
        full_name: r.full_name,
        name: r.name,
        description: r.description,
        language: r.language || null,
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        source: 'mine',
      });
    });

    similarRepos.forEach((s) => {
      if (!list.some((existing) => existing.full_name.toLowerCase() === s.full_name.toLowerCase())) {
        list.push({
          full_name: s.full_name,
          name: s.name,
          description: s.description,
          language: s.language,
          stars: s.stargazers_count,
          forks: s.forks_count,
          source: 'similar',
        });
      }
    });

    FEATURED_REPOSITORIES.forEach((f) => {
      if (!list.some((existing) => existing.full_name.toLowerCase() === f.full_name.toLowerCase())) {
        list.push({
          full_name: f.full_name,
          name: f.name,
          description: f.description,
          language: f.language,
          source: 'featured',
        });
      }
    });

    return list;
  }, [myRepos, similarRepos]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    consolidatedSuggestions.forEach((s) => {
      if (s.language) set.add(s.language);
    });
    return Array.from(set).sort();
  }, [consolidatedSuggestions]);

  const filteredSuggestions = useMemo(() => {
    return consolidatedSuggestions.filter((item) => {
      if (catalogCategory === 'mine' && item.source !== 'mine') return false;
      if (catalogCategory === 'similar' && item.source !== 'similar') return false;
      if (catalogCategory === 'featured' && item.source !== 'featured') return false;
      if (catalogLanguage !== 'all' && item.language !== catalogLanguage) return false;

      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchFullName = item.full_name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
        const matchLang = item.language?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchFullName && !matchDesc && !matchLang) return false;
      }

      return true;
    });
  }, [consolidatedSuggestions, catalogCategory, catalogLanguage, catalogSearch]);

  const ranked = useMemo(() => {
    return [...repos].sort((a, b) => b.healthScore - a.healthScore);
  }, [repos]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ArrowUpDown size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Comparador y Benchmarking de Repositorios</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Analiza y compara de 2 a 5 repositorios lado a lado con inteligencia analítica, radar multidimensional de 8 ejes y métricas operativas.
        </p>
      </div>

      {/* Barra de entrada manual */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-card)',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Escribe 'owner/repo' o pega una URL de GitHub para agregar a la comparación..."
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRepoByQuery(repoInput)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <button
          onClick={() => addRepoByQuery(repoInput)}
          disabled={loadingAdd || repos.length >= 5}
          className="btn-primary"
        >
          {loadingAdd ? <Loader size={16} className="spin" /> : <Plus size={16} />}
          Agregar
        </button>
      </div>

      {error && (
        <div
          style={{
            color: 'var(--danger-color)',
            fontSize: '0.9rem',
            padding: '0.6rem 1rem',
            background: 'rgba(248,81,73,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(248,81,73,0.3)',
          }}
        >
          {error}
        </div>
      )}

      {/* Repositorios agregados actualmente */}
      {repos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Repositorios en la comparación ({repos.length} de 5):
            </span>
            {repos.length >= 2 && (
              <button
                onClick={() => setShowCatalog(!showCatalog)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {showCatalog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showCatalog ? 'Ocultar catálogo de sugerencias' : 'Explorar más repositorios'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {repos.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: `${COLORS[i % COLORS.length]}18`,
                  border: `1px solid ${COLORS[i % COLORS.length]}55`,
                  padding: '0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                }}
              >
                <img
                  src={r.data.repo.owner.avatar_url}
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: '50%' }}
                />
                <span style={{ color: COLORS[i % COLORS.length], fontWeight: 600 }}>
                  {r.data.repo.full_name}
                </span>
                <span
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    color: '#c9d1d9',
                  }}
                >
                  {r.healthScore}/100
                </span>
                <span
                  title="Quitar de la comparación"
                  onClick={() => removeRepo(r.id)}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                >
                  <X size={14} style={{ color: 'var(--text-secondary)' }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ CATALOGO DE RECOMENDACIONES (VISIBLE SI < 2 REPOS O POR TOGGLE) ══════════ */}
      {(repos.length < 2 || showCatalog) && (
        <div className="chart-card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--accent-color)' }} />
              <h4 style={{ margin: 0 }}>Catálogo de Sugerencias para Comparar</h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-dark)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '220px' }}>
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Filtrar recomendaciones..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }}
              />
              {catalogSearch && (
                <X size={14} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setCatalogSearch('')} />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
            <button
              className={`filter-pill ${catalogCategory === 'all' ? 'active' : ''}`}
              onClick={() => setCatalogCategory('all')}
            >
              Todos ({consolidatedSuggestions.length})
            </button>
            {myRepos.length > 0 && (
              <button
                className={`filter-pill ${catalogCategory === 'mine' ? 'active' : ''}`}
                onClick={() => setCatalogCategory('mine')}
              >
                <FolderGit2 size={13} />
                Mis Repositorios ({myRepos.length})
              </button>
            )}
            {similarRepos.length > 0 && (
              <button
                className={`filter-pill ${catalogCategory === 'similar' ? 'active' : ''}`}
                onClick={() => setCatalogCategory('similar')}
              >
                <Sparkles size={13} />
                Similares por Benchmarking ({similarRepos.length})
              </button>
            )}
            <button
              className={`filter-pill ${catalogCategory === 'featured' ? 'active' : ''}`}
              onClick={() => setCatalogCategory('featured')}
            >
              Destacados ({FEATURED_REPOSITORIES.length})
            </button>

            {availableLanguages.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
                <select
                  value={catalogLanguage}
                  onChange={(e) => setCatalogLanguage(e.target.value)}
                  className="select-filter"
                >
                  <option value="all">Cualquier lenguaje</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.3rem' }}>
            {filteredSuggestions.map((item) => {
              const isAlreadyAdded = repos.some(
                (r) => r.id.toLowerCase() === item.full_name.toLowerCase()
              );

              return (
                <div
                  key={item.full_name}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: isAlreadyAdded ? '1px solid rgba(63,185,80,0.3)' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.8rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.full_name}>
                        {item.full_name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.source === 'mine' ? 'Tu repositorio' : item.source === 'similar' ? 'Benchmark similar' : 'Proyecto destacado'}
                      </span>
                    </div>

                    {isAlreadyAdded ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, flexShrink: 0 }}>
                        <Check size={13} /> Agregado
                      </span>
                    ) : (
                      <button
                        onClick={() => addRepoByQuery(item.full_name)}
                        disabled={loadingAdd || repos.length >= 5}
                        className="btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
                      >
                        <Plus size={12} /> Comparar
                      </button>
                    )}
                  </div>

                  {item.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                    {item.language && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span className="lang-dot" /> {item.language}
                      </span>
                    )}
                    {item.stars !== undefined && item.stars > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={11} /> {formatNumber(item.stars)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ RESULTADOS COMPARATIVOS (AL HABER >= 2 REPOS) ══════════ */}
      {repos.length >= 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Barra de navegación de vistas organizada */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
              background: 'var(--bg-card)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                className={`filter-pill ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                <Layers size={13} />
                Vista Integral
              </button>
              <button
                className={`filter-pill ${viewMode === 'summary' ? 'active' : ''}`}
                onClick={() => setViewMode('summary')}
              >
                <Trophy size={13} />
                Veredicto y Radar 8D
              </button>
              <button
                className={`filter-pill ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => setViewMode('timeline')}
              >
                <TrendingUp size={13} />
                Ritmo 52 Semanas
              </button>
              <button
                className={`filter-pill ${viewMode === 'efficiency' ? 'active' : ''}`}
                onClick={() => setViewMode('efficiency')}
              >
                <Zap size={13} />
                Eficiencia y Stack
              </button>
              <button
                className={`filter-pill ${viewMode === 'matrix' ? 'active' : ''}`}
                onClick={() => setViewMode('matrix')}
              >
                <ArrowUpDown size={13} />
                Matriz Detallada
              </button>
            </div>

            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Comparando {repos.length} proyectos simultáneamente
            </span>
          </div>

          {/* ── BLOQUE 1: VEREDICTO DE BENCHMARKING (INSIGHTS CLAVE) ── */}
          {(viewMode === 'all' || viewMode === 'summary') && verdict && (
            <div className="chart-card" style={{ padding: '1.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Sparkles size={18} style={{ color: '#bc8cff' }} />
                <h4 style={{ margin: 0 }}>Veredicto Ejecutivo de Benchmarking</h4>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'rgba(188,140,255,0.15)', color: '#bc8cff', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 600 }}>
                  Auditoría Inteligente
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Ritmo reciente */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#58a6ff', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <TrendingUp size={14} />
                    Mayor Ritmo Reciente
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    {verdict.leaderMomentum.data.repo.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                    {advancedMetrics[verdict.leaderMomentum.id]?.recentCommits12w} commits en las últimas 12 semanas.
                  </span>
                </div>

                {/* Agilidad PRs */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3fb950', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <Zap size={14} />
                    Mayor Agilidad de PRs
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    {verdict.leaderPR.data.repo.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                    Tiempo promedio de merge: {advancedMetrics[verdict.leaderPR.id]?.avgMergeHours} horas.
                  </span>
                </div>

                {/* Resiliencia */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f0883e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <Shield size={14} />
                    Menor Riesgo (Bus Factor)
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    {verdict.leaderBusFactor.data.repo.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                    Bus Factor de {advancedMetrics[verdict.leaderBusFactor.id]?.busFactor} colaboradores clave.
                  </span>
                </div>

                {/* Soporte */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#bc8cff', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <CheckCircle2 size={14} />
                    Mayor Tasa de Soporte
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    {verdict.leaderIssues.data.repo.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                    Resuelve el {advancedMetrics[verdict.leaderIssues.id]?.issueResolutionRate}% de sus incidencias.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── BLOQUE 2: RADAR DE SALUD MULTIDIMENSIONAL (8 EJES) Y RANKING ── */}
          {(viewMode === 'all' || viewMode === 'summary') && (
            <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
              {/* Radar de 8 ejes */}
              <div className="chart-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={18} style={{ color: 'var(--accent-color)' }} />
                    <h4 style={{ margin: 0 }}>Radar de Salud y Madurez Técnica (8 Ejes)</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Escala normalizada 0 - 100</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.8rem 0' }}>
                  Evalúa velocidad de integración, soporte, consistencia reciente, gobernanza, resiliencia y equidad.
                </p>

                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarCompareData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="#30363d" />
                    <PolarAngleAxis dataKey="metric" stroke="#8b949e" fontSize={11} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#30363d" fontSize={10} />
                    {repos.map((r, i) => (
                      <Radar
                        key={r.id}
                        name={r.data.repo.name}
                        dataKey={r.data.repo.name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.78rem' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        color: '#c9d1d9',
                        fontSize: '0.8rem',
                      }}
                      formatter={(val: any, name: any) => [`${val} / 100 pts`, name]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking por Salud Integral */}
              <div className="chart-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Trophy size={18} style={{ color: '#f0883e' }} />
                  <h4 style={{ margin: 0 }}>Ranking de Posicionamiento por Salud Integral</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {ranked.map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        background: i === 0 ? 'rgba(240,136,62,0.08)' : 'rgba(255,255,255,0.02)',
                        border: i === 0 ? '1px solid rgba(240,136,62,0.35)' : '1px solid var(--border-color)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: i === 0 ? '#f0883e' : i === 1 ? '#8b949e' : '#6e7681',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        #{i + 1}
                      </span>
                      <img
                        src={r.data.repo.owner.avatar_url}
                        alt=""
                        style={{ width: 34, height: 34, borderRadius: '8px' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.data.repo.full_name}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {r.data.repo.language || 'Sin lenguaje'} • {formatNumber(r.data.repo.stargazers_count)} stars • Bus Factor: {advancedMetrics[r.id]?.busFactor}
                        </span>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1.2rem',
                          color: r.healthScore >= 70 ? '#3fb950' : r.healthScore >= 40 ? '#f0883e' : '#f85149',
                        }}
                      >
                        {r.healthScore} / 100
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.2rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <Lightbulb size={16} style={{ color: '#e3b341', flexShrink: 0 }} />
                  <span>
                    <strong>Diagnóstico:</strong> El Health Score pondera de 0 a 100 la combinación de actividad constante, eficiencia en issues, gobernanza comunitaria y balance de esfuerzo técnico.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── BLOQUE 3: CURVA TEMPORAL DE RITMO (52 SEMANAS) ── */}
          {(viewMode === 'all' || viewMode === 'timeline') && (
            <div className="chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} style={{ color: '#58a6ff' }} />
                  <h4 style={{ margin: 0 }}>Curva Temporal de Ritmo y Actividad (Últimas 52 Semanas)</h4>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Evolución semanal sincronizada del último año
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                Compara la aceleración, consistencia o desaceleración en el volumen de commits semanales a lo largo de los últimos 12 meses.
              </p>

              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis
                      dataKey="week"
                      stroke="#8b949e"
                      fontSize={11}
                      interval={Math.max(1, Math.floor(timelineData.length / 8))}
                    />
                    <YAxis stroke="#8b949e" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        color: '#c9d1d9',
                        fontSize: '0.8rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      }}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullDate || _label}
                      formatter={(val: any, name: any) => [`${val} commits`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.8rem' }} />
                    {repos.map((r, i) => (
                      <Line
                        key={r.id}
                        type="monotone"
                        dataKey={r.data.repo.name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                  No hay suficiente historial de commits semanal disponible para trazar la curva temporal.
                </p>
              )}
            </div>
          )}

          {/* ── BLOQUE 4: EFICIENCIA OPERATIVA & STACK TECNOLOGICO ── */}
          {(viewMode === 'all' || viewMode === 'efficiency') && (
            <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
              {/* Eficiencia de proceso */}
              <div className="chart-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} style={{ color: '#3fb950' }} />
                    <h4 style={{ margin: 0 }}>Eficiencia de Procesos e Integración</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Porcentajes (0 - 100%)</span>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={efficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="metric" stroke="#8b949e" fontSize={11} />
                    <YAxis stroke="#8b949e" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        color: '#c9d1d9',
                        fontSize: '0.8rem',
                      }}
                      formatter={(val: any, name: any) => [`${val}%`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '0.78rem' }} />
                    {repos.map((r, i) => (
                      <Bar
                        key={r.id}
                        dataKey={r.data.repo.name}
                        fill={COLORS[i % COLORS.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>

                {/* Sub-tarjetas de tiempo de merge */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Tiempo Promedio de Aprobación y Merge de PRs:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${repos.length}, 1fr)`, gap: '0.5rem' }}>
                    {repos.map((r, i) => (
                      <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: COLORS[i % COLORS.length], display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.data.repo.name}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {advancedMetrics[r.id]?.avgMergeHours} h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stack tecnologico */}
              <div className="chart-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code2 size={18} style={{ color: '#bc8cff' }} />
                    <h4 style={{ margin: 0 }}>Composición Tecnológica del Código</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Distribución en bytes</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {repos.map((r, i) => {
                    const breakdown = advancedMetrics[r.id]?.languagesBreakdown || [];
                    return (
                      <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: COLORS[i % COLORS.length] }}>
                            {r.data.repo.full_name}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {r.data.repo.language || 'Sin definir'}
                          </span>
                        </div>

                        {/* Barra segmentada */}
                        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#21262d', marginBottom: '0.5rem' }}>
                          {breakdown.map((lang, lIdx) => (
                            <div
                              key={lang.name}
                              title={`${lang.name}: ${lang.percent}%`}
                              style={{
                                width: `${Math.max(lang.percent, 3)}%`,
                                background: LANG_COLORS[lang.name] || COLORS[lIdx % COLORS.length],
                              }}
                            />
                          ))}
                        </div>

                        {/* Leyenda de lenguajes */}
                        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {breakdown.map((lang, lIdx) => (
                            <span key={lang.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[lang.name] || COLORS[lIdx % COLORS.length] }} />
                              {lang.name} <strong>{lang.percent}%</strong>
                            </span>
                          ))}
                          {breakdown.length === 0 && (
                            <span style={{ color: 'var(--text-secondary)' }}>Lenguajes no reportados</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── BLOQUE 5: MATRIZ DE COMPARACION DIRECTA CATEGORIZADA ── */}
          {(viewMode === 'all' || viewMode === 'matrix') && (
            <div className="chart-card" style={{ overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowUpDown size={18} style={{ color: 'var(--accent-color)' }} />
                  <h4 style={{ margin: 0 }}>Matriz de Comparación Detallada por Categorías</h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Las celdas verdes señalan la métrica más favorable
                </span>
              </div>

              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Métrica / Dimensión</th>
                    {repos.map((r, i) => (
                      <th key={r.id} style={{ color: COLORS[i % COLORS.length] }}>
                        {r.data.repo.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* SECCION 1: SALUD Y MADUREZ */}
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th colSpan={repos.length + 1} style={{ color: 'var(--accent-color)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.82rem', textTransform: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Shield size={14} style={{ color: 'var(--accent-color)' }} />
                        Salud y Madurez Técnica
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <td>Health Score Global (0-100)</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => x.healthScore));
                      return (
                        <td key={r.id} className={r.healthScore === best ? 'cell-best' : ''}>
                          {r.healthScore} / 100
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Bus Factor (Resiliencia)</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.busFactor || 0));
                      const val = advancedMetrics[r.id]?.busFactor || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {val} {val === 1 ? 'colaborador' : 'colaboradores'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Equidad de Carga (Gini invertido)</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.giniEquity || 0));
                      const val = advancedMetrics[r.id]?.giniEquity || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {val}% (Gini: {advancedMetrics[r.id]?.gini})
                        </td>
                      );
                    })}
                  </tr>

                  {/* SECCION 2: RITMO Y CAPACIDAD */}
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th colSpan={repos.length + 1} style={{ color: 'var(--accent-color)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.82rem', textTransform: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <TrendingUp size={14} style={{ color: '#58a6ff' }} />
                        Ritmo y Capacidad de Entrega
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <td>Commits en Últimas 12 Semanas</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.recentCommits12w || 0));
                      const val = advancedMetrics[r.id]?.recentCommits12w || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {formatNumber(val)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Commits Históricos Totales</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.totalCommits || 0));
                      const val = advancedMetrics[r.id]?.totalCommits || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {formatNumber(val)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Días desde Último Push</td>
                    {repos.map((r) => {
                      const best = Math.min(...repos.map((x) => advancedMetrics[x.id]?.daysSincePush || 0));
                      const val = advancedMetrics[r.id]?.daysSincePush || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {val === 0 ? 'Hoy' : `Hace ${val} días`}
                        </td>
                      );
                    })}
                  </tr>

                  {/* SECCION 3: INTEGRACION CONTINUA Y PRS */}
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th colSpan={repos.length + 1} style={{ color: 'var(--accent-color)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.82rem', textTransform: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <GitPullRequest size={14} style={{ color: '#bc8cff' }} />
                        Flujo de Pull Requests (Integración)
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <td>Tiempo Promedio de Merge</td>
                    {repos.map((r) => {
                      const validMergeTimes = repos
                        .map((x) => advancedMetrics[x.id]?.avgMergeHours || 0)
                        .filter((h) => h > 0);
                      const best = validMergeTimes.length > 0 ? Math.min(...validMergeTimes) : 0;
                      const val = advancedMetrics[r.id]?.avgMergeHours || 0;
                      return (
                        <td key={r.id} className={val > 0 && val === best ? 'cell-best' : ''}>
                          {val > 0 ? `${val} horas` : 'N/D'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>PRs Mergeadas / Abiertas</td>
                    {repos.map((r) => (
                      <td key={r.id}>
                        {advancedMetrics[r.id]?.mergedPRsCount} mergeadas / {advancedMetrics[r.id]?.openPRsCount} abiertas
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Cobertura de Code Review</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.reviewCoveragePercent || 0));
                      const val = advancedMetrics[r.id]?.reviewCoveragePercent || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {val}%
                        </td>
                      );
                    })}
                  </tr>

                  {/* SECCION 4: INCIDENCIAS Y SOPORTE */}
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th colSpan={repos.length + 1} style={{ color: 'var(--accent-color)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.82rem', textTransform: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <AlertCircle size={14} style={{ color: '#f0883e' }} />
                        Gestión de Incidencias (Soporte)
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <td>Tasa de Cierre de Issues</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => advancedMetrics[x.id]?.issueResolutionRate || 0));
                      const val = advancedMetrics[r.id]?.issueResolutionRate || 0;
                      return (
                        <td key={r.id} className={val === best ? 'cell-best' : ''}>
                          {val}% ({advancedMetrics[r.id]?.closedIssuesCount} cerradas)
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Issues Abiertas Pendientes</td>
                    {repos.map((r) => {
                      const best = Math.min(...repos.map((x) => x.data.repo.open_issues_count));
                      return (
                        <td key={r.id} className={r.data.repo.open_issues_count === best ? 'cell-best' : ''}>
                          {r.data.repo.open_issues_count}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Tiempo Promedio de Cierre</td>
                    {repos.map((r) => {
                      const val = advancedMetrics[r.id]?.avgIssueDays || 0;
                      return (
                        <td key={r.id}>
                          {val > 0 ? `${val} días` : 'N/D'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* SECCION 5: COMUNIDAD Y STACK */}
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th colSpan={repos.length + 1} style={{ color: 'var(--accent-color)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.82rem', textTransform: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Globe size={14} style={{ color: '#3fb950' }} />
                        Comunidad y Gobernanza
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <td>Estrellas (Stars)</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => x.data.repo.stargazers_count));
                      return (
                        <td key={r.id} className={r.data.repo.stargazers_count === best ? 'cell-best' : ''}>
                          {formatNumber(r.data.repo.stargazers_count)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Forks</td>
                    {repos.map((r) => {
                      const best = Math.max(...repos.map((x) => x.data.repo.forks_count));
                      return (
                        <td key={r.id} className={r.data.repo.forks_count === best ? 'cell-best' : ''}>
                          {formatNumber(r.data.repo.forks_count)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Lenguaje Principal</td>
                    {repos.map((r) => (
                      <td key={r.id}>{r.data.repo.language || 'Sin definir'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Licencia de Software</td>
                    {repos.map((r) => (
                      <td key={r.id}>{r.data.repo.license?.name || 'No especificada'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Estado vacio si hay menos de 2 repos */}
      {repos.length < 2 && (
        <div className="chart-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <ArrowUpDown size={44} style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem' }} />
          <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Agrega al menos 2 repositorios para iniciar el Benchmarking</h4>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0.5rem auto 0', fontSize: '0.9rem' }}>
            Selecciona un repositorio de tus proyectos, explora las sugerencias automáticas o introduce cualquier repositorio de GitHub arriba para activar la auditoría comparativa completa.
          </p>
        </div>
      )}
    </div>
  );
}
