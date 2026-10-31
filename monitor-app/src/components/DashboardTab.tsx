/**
 * DashboardTab — Pestana principal con KPIs ejecutivos, Health Score y graficos analiticos.
 * Metricas calculadas de BI que superan la pestana Insights nativa de GitHub.
 * Sin emojis y sin Power BI.
 */
import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  GitGraph,
  AlertCircle,
  Star,
  GitFork,
  Activity,
  Shield,
  Clock,
  Users,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  FolderGit2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { FullRepoData } from '../services/github';
import type { HealthScore, ContributorStats, Issue, CommitActivity, CodeFrequencyPoint } from '../types';
import {
  calculateHealthScore,
  formatNumber,
  languagePercentages,
  daysSinceLastActivity,
  avgIssueResolutionDays,
  calculateBusFactor,
} from '../utils/metrics';

interface Props {
  data: FullRepoData;
  loading: boolean;
  onSearchRepo?: (repoName: string) => void;
  onOpenRepoModal?: () => void;
}

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#f0883e', '#f85149', '#79c0ff', '#d2a8ff', '#56d364'];

export default function DashboardTab({ data, loading, onSearchRepo, onOpenRepoModal }: Props) {
  const [quickInput, setQuickInput] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim() && onSearchRepo) {
      onSearchRepo(quickInput.trim());
      setQuickInput('');
    }
  };

  if (loading) return <p style={{ padding: '2rem' }}>Cargando panel de control...</p>;

  const { repo, commitActivity, issues, contributorStats, community, codeFrequency, languages } = data;

  // Metricas calculadas
  const healthScore: HealthScore = calculateHealthScore(repo, commitActivity, issues, community, contributorStats);
  const busFactor = calculateBusFactor(contributorStats);
  const avgResolution = avgIssueResolutionDays(issues);
  const lastActivityDays = daysSinceLastActivity(repo.pushed_at);
  const totalCommits = contributorStats.reduce((s: number, c: ContributorStats) => s + c.total, 0);
  const langData = languagePercentages(languages);

  // Issues reales (sin pull requests)
  const realIssues = issues.filter((i: Issue) => !i.pull_request);
  const issuesClosed = realIssues.filter((i: Issue) => i.state === 'closed').length;
  const issuesOpen = realIssues.filter((i: Issue) => i.state === 'open').length;
  const issueCloseRate = realIssues.length > 0 ? Math.round((issuesClosed / realIssues.length) * 100) : 0;

  // Velocidad de commits (ultimas 4 semanas vs 4 anteriores)
  const last4 = commitActivity.slice(-4).reduce((s: number, w: CommitActivity) => s + w.total, 0);
  const prev4 = commitActivity.slice(-8, -4).reduce((s: number, w: CommitActivity) => s + w.total, 0);
  const velocityTrend = prev4 > 0 ? Math.round(((last4 - prev4) / prev4) * 100) : 0;

  // Datos para graficos
  const weeklyCommitData = commitActivity.slice(-16).map((w: CommitActivity) => ({
    week: new Date(w.week * 1000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    commits: w.total,
  }));

  const codeFreqData = codeFrequency.slice(-16).map((cf: CodeFrequencyPoint) => ({
    week: new Date(cf.week * 1000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    anadidas: cf.additions,
    eliminadas: Math.abs(cf.deletions),
  }));

  const radarData = [
    { metric: 'Actividad', value: healthScore.activity, max: 20 },
    { metric: 'Issues', value: healthScore.issues, max: 20 },
    { metric: 'Comunidad', value: healthScore.community, max: 20 },
    { metric: 'Documentacion', value: healthScore.documentation, max: 20 },
    { metric: 'Distribucion', value: healthScore.distribution, max: 20 },
  ];

  const healthColor = healthScore.total >= 70 ? '#3fb950' : healthScore.total >= 40 ? '#f0883e' : '#f85149';

  return (
    <>
      {/* ── Barra de busqueda rapida en Dashboard BI ── */}
      <div className="dashboard-search-bar" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleQuickSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div className="search-bar-inner" style={{ flex: 1 }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar o cambiar repositorio (ej. facebook/react o URL completa)..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!quickInput.trim()} style={{ whiteSpace: 'nowrap' }}>
            Analizar
          </button>
        </form>

        {onOpenRepoModal && (
          <button onClick={onOpenRepoModal} className="btn-outline" style={{ whiteSpace: 'nowrap' }}>
            <FolderGit2 size={16} />
            Explorar Repositorios
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        {/* Health Score */}
        <div className="metric-card" style={{ borderColor: `${healthColor}44` }}>
          <div className="metric-header">
            <span>Health Score</span>
            <Shield size={18} style={{ color: healthColor }} />
          </div>
          <div className="metric-value" style={{ color: healthColor }}>
            {healthScore.total}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</span>
          </div>
          <div className="metric-trend" style={{ color: healthColor }}>
            <Activity size={14} />
            <span>
              {healthScore.total >= 70
                ? 'Proyecto saludable'
                : healthScore.total >= 40
                ? 'Necesita atencion'
                : 'Estado critico'}
            </span>
          </div>
        </div>

        {/* Total Commits */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Commits</span>
            <GitGraph size={18} />
          </div>
          <div className="metric-value">{formatNumber(totalCommits)}</div>
          <div className={`metric-trend ${velocityTrend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {velocityTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {velocityTrend >= 0 ? '+' : ''}
              {velocityTrend}% vs mes anterior
            </span>
          </div>
        </div>

        {/* Estrellas */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Estrellas</span>
            <Star size={18} />
          </div>
          <div className="metric-value">{formatNumber(repo.stargazers_count)}</div>
          <div className="metric-trend trend-up">
            <TrendingUp size={14} />
            <span>Popularidad en GitHub</span>
          </div>
        </div>

        {/* Forks */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Forks</span>
            <GitFork size={18} />
          </div>
          <div className="metric-value">{formatNumber(repo.forks_count)}</div>
          <div className="metric-trend trend-up">
            <TrendingUp size={14} />
            <span>Participacion externa</span>
          </div>
        </div>

        {/* Issues */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Issues Abiertos / Cerrados</span>
            <AlertCircle size={18} />
          </div>
          <div className="metric-value">
            {issuesOpen} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ {issuesClosed}</span>
          </div>
          <div className={`metric-trend ${issueCloseRate >= 60 ? 'trend-up' : 'trend-down'}`}>
            {issueCloseRate >= 60 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{issueCloseRate}% tasa de resolucion</span>
          </div>
        </div>

        {/* Bus Factor */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Bus Factor</span>
            <Users size={18} />
          </div>
          <div
            className="metric-value"
            style={{
              color:
                busFactor <= 1
                  ? 'var(--danger-color)'
                  : busFactor <= 2
                  ? 'var(--warning-color, #f0883e)'
                  : 'var(--success-color)',
            }}
          >
            {busFactor}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <Users size={14} />
            <span>
              {busFactor <= 1
                ? 'Riesgo alto: 1 persona critica'
                : `${busFactor} desarrolladores concentran >50% commits`}
            </span>
          </div>
        </div>

        {/* Tiempo de resolucion */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Tiempo Resolucion Issues</span>
            <Clock size={18} />
          </div>
          <div className="metric-value">
            {avgResolution}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}> dias</span>
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={14} />
            <span>Promedio de ciclo de cierre</span>
          </div>
        </div>

        {/* Ultima actividad */}
        <div className="metric-card">
          <div className="metric-header">
            <span>Ultima Actividad</span>
            <Zap size={18} />
          </div>
          <div
            className="metric-value"
            style={{
              color: lastActivityDays <= 7 ? 'var(--success-color)' : lastActivityDays <= 30 ? '#f0883e' : 'var(--danger-color)',
            }}
          >
            {lastActivityDays === 0 ? 'Hoy' : `${lastActivityDays}d`}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <Zap size={14} />
            <span>
              {lastActivityDays <= 7
                ? 'Proyecto activo'
                : lastActivityDays <= 30
                ? 'Actividad moderada'
                : 'Posiblemente inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Graficos */}
      <div className="charts-grid">
        {/* Grafico 1: Commits por semana */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0 }}>Actividad de Commits (ultimas 16 semanas)</h4>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyCommitData}>
              <defs>
                <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="week" stroke="#8b949e" fontSize={11} />
              <YAxis stroke="#8b949e" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#c9d1d9' }}
              />
              <Area type="monotone" dataKey="commits" stroke="#58a6ff" fill="url(#commitGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico 2: Radar de salud */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Shield size={18} style={{ color: healthColor }} />
            <h4 style={{ margin: 0 }}>Radar de Salud del Proyecto (5 Dimensiones)</h4>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#30363d" />
              <PolarAngleAxis dataKey="metric" stroke="#8b949e" fontSize={12} />
              <PolarRadiusAxis angle={90} domain={[0, 20]} stroke="#30363d" fontSize={10} />
              <Radar name="Salud" dataKey="value" stroke={healthColor} fill={healthColor} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico 3: Lineas anadidas vs eliminadas */}
        {codeFreqData.length > 0 && (
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BarChart3 size={18} style={{ color: '#3fb950' }} />
              <h4 style={{ margin: 0 }}>Lineas de Codigo Anadidas vs Eliminadas</h4>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={codeFreqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="week" stroke="#8b949e" fontSize={11} />
                <YAxis stroke="#8b949e" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#c9d1d9' }}
                />
                <Legend />
                <Bar dataKey="anadidas" fill="#3fb950" radius={[4, 4, 0, 0]} name="Anadidas" />
                <Bar dataKey="eliminadas" fill="#f85149" radius={[4, 4, 0, 0]} name="Eliminadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Grafico 4: Lenguajes */}
        {langData.length > 0 && (
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PieChartIcon size={18} style={{ color: '#bc8cff' }} />
              <h4 style={{ margin: 0 }}>Distribucion de Lenguajes</h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={langData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {langData.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#c9d1d9' }}
                    formatter={(val: any) => [`${formatNumber(Number(val) || 0)} bytes`, 'Tamano']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                {langData.slice(0, 6).map((lang, i) => (
                  <div key={lang.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{lang.name}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>{lang.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
