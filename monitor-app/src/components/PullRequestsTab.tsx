import { useState } from 'react';
import {
  GitPullRequest,
  Clock,
  CheckCircle,
  Timer,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import type { PullRequest } from '../types';
import { calculatePRMetrics } from '../utils/metrics';

interface Props {
  data: FullRepoData;
  loading: boolean;
}

export default function PullRequestsTab({ data, loading }: Props) {
  const [now] = useState(() => Date.now());
  if (loading) return <p style={{ padding: '2rem' }}>Cargando Pull Requests...</p>;

  const { pullRequests } = data;
  const metrics = calculatePRMetrics(pullRequests);

  // Datos para pie chart de estados
  const stateData = [
    { name: 'Abiertas', value: metrics.totalOpen, color: '#58a6ff' },
    { name: 'Mergeadas', value: metrics.totalMerged, color: '#3fb950' },
    { name: 'Rechazadas', value: metrics.totalRejected, color: '#f85149' },
  ].filter((d) => d.value > 0);

  // Datos para grafico de PRs por autor
  const authorData = Object.entries(metrics.prsByAuthor)
    .sort(([, a], [, b]) => b.created - a.created)
    .slice(0, 10)
    .map(([author, prData]) => ({
      name: author.length > 12 ? author.slice(0, 12) + '...' : author,
      Creadas: prData.created,
      Mergeadas: prData.merged,
    }));

  // PRs abiertas ordenadas por antiguedad (las mas viejas primero)
  const openPRs = pullRequests
    .filter((pr: PullRequest) => pr.state === 'open')
    .sort((a: PullRequest, b: PullRequest) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const formatTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} horas`;
    return `${Math.round(hours / 24)} dias`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <GitPullRequest size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Pull Requests y Flujo de Calidad de Codigo</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Metricas de velocidad de revision, cuellos de botella y calidad de contribuciones no disponibles en Insights nativo.
        </p>
      </div>

      {/* KPIs de Pull Requests */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>PRs Abiertas</span>
            <GitPullRequest size={18} />
          </div>
          <div className="metric-value">{metrics.totalOpen}</div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Trabajo en proceso de integracion</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Tiempo Medio de Merge</span>
            <Clock size={18} />
          </div>
          <div className="metric-value">{formatTime(metrics.avgMergeTimeHours)}</div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Velocidad promedio del ciclo de review</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Sin Revisor Asignado</span>
            <AlertTriangle
              size={18}
              style={{ color: metrics.prsWithoutReviewers > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}
            />
          </div>
          <div
            className="metric-value"
            style={{ color: metrics.prsWithoutReviewers > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}
          >
            {metrics.prsWithoutReviewers}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>{metrics.prsWithoutReviewers > 0 ? 'Riesgo de estancamiento' : 'Todas con revisor'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Tasa de Aprobacion</span>
            <CheckCircle size={18} />
          </div>
          <div className="metric-value">
            {metrics.totalMerged + metrics.totalRejected > 0
              ? `${Math.round((metrics.totalMerged / (metrics.totalMerged + metrics.totalRejected)) * 100)}%`
              : 'N/A'}
          </div>
          <div className="metric-trend trend-up">
            <span>{metrics.totalMerged} mergeadas / {metrics.totalRejected} cerradas</span>
          </div>
        </div>
      </div>

      {/* Graficos de PRs */}
      <div className="charts-grid">
        {/* Distribucion de Estados */}
        {stateData.length > 0 && (
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PieChartIcon size={18} style={{ color: 'var(--accent-color)' }} />
              <h4 style={{ margin: 0 }}>Distribucion por Estado</h4>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {stateData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#c9d1d9',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PRs por Autor */}
        {authorData.length > 0 && (
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BarChart3 size={18} style={{ color: '#3fb950' }} />
              <h4 style={{ margin: 0 }}>Top Autores de Pull Requests</h4>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={authorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" fontSize={11} />
                <YAxis stroke="#8b949e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#c9d1d9',
                  }}
                />
                <Legend />
                <Bar dataKey="Creadas" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mergeadas" fill="#3fb950" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lista de PRs abiertas ordenadas por antiguedad */}
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Timer size={18} style={{ color: 'var(--accent-color)' }} />
          <h4 style={{ margin: 0 }}>Pull Requests Abiertas en Espera (Mas Antiguas Primero)</h4>
        </div>

        {openPRs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {openPRs.slice(0, 10).map((pr: PullRequest) => {
              const ageDays = Math.floor(
                (now - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isOld = ageDays > 14;

              return (
                <div
                  key={pr.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    background: isOld ? 'rgba(248,81,73,0.06)' : 'rgba(255,255,255,0.02)',
                    border: isOld ? '1px solid rgba(248,81,73,0.3)' : '1px solid var(--border-color)',
                  }}
                >
                  <img
                    src={pr.user.avatar_url}
                    alt={pr.user.login}
                    style={{ width: 28, height: 28, borderRadius: '50%' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        #{pr.number}
                      </span>
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'var(--accent-color)',
                          textDecoration: 'none',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pr.title}
                      </a>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      por {pr.user.login} | {pr.requested_reviewers?.length || 0} revisores
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '10px',
                      background: isOld ? 'rgba(248,81,73,0.2)' : 'rgba(88,166,255,0.15)',
                      color: isOld ? 'var(--danger-color)' : 'var(--accent-color)',
                      flexShrink: 0,
                    }}
                  >
                    {ageDays === 0 ? 'Hoy' : `Hace ${ageDays}d`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            No hay Pull Requests abiertas actualmente en este repositorio.
          </p>
        )}
      </div>
    </div>
  );
}
