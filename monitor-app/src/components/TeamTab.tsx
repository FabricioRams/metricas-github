/**
 * TeamTab — Analisis detallado del equipo de desarrollo.
 * Metricas de contribucion individual, distribucion de carga, lineas de codigo,
 * deteccion proactiva de sobrecarga y consistencia semanal.
 * Sin emojis y sin Power BI.
 */
import { useState, useMemo } from 'react';
import {
  GitGraph,
  AlertCircle,
  GitPullRequest,
  Code,
  Calendar,
  AlertTriangle,
  Users,
  BarChart3,
  TrendingUp,
  Search,
  Filter,
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
} from 'recharts';
import type { FullRepoData } from '../services/github';
import type { ContributorStats, TeamMemberMetrics } from '../types';
import { calculateTeamMetrics, formatNumber, calculateGini } from '../utils/metrics';

interface Props {
  data: FullRepoData;
  loading: boolean;
}

const MEMBER_COLORS = [
  '#58a6ff', '#bc8cff', '#3fb950', '#f0883e', '#f85149',
  '#79c0ff', '#d2a8ff', '#56d364', '#e3b341', '#39c5cf',
  '#ff7b72', '#a371f7', '#7ee787', '#ffa657', '#54a0ff', '#5f27cd',
];

export default function TeamTab({ data, loading }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCardsCount, setVisibleCardsCount] = useState(12);
  const [barMemberLimit, setBarMemberLimit] = useState(10);
  const [lineLimit, setLineLimit] = useState(5);
  const [selectedLineMembers, setSelectedLineMembers] = useState<string[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [memberFilterInput, setMemberFilterInput] = useState('');

  const { contributorStats = [], issues = [], pullRequests = [] } = data || {};
  const teamMetrics = useMemo(() => {
    return calculateTeamMetrics(contributorStats, issues, pullRequests);
  }, [contributorStats, issues, pullRequests]);

  // Coeficiente Gini para medicion objetiva de equidad de contribucion
  const commits = useMemo(() => contributorStats.map((c: ContributorStats) => c.total), [contributorStats]);
  const gini = useMemo(() => calculateGini(commits), [commits]);
  const equityText = gini <= 0.25 ? 'Alta Equidad' : gini <= 0.5 ? 'Equidad Moderada' : 'Alta Desigualdad';
  const equityColor = gini <= 0.25 ? 'var(--success-color)' : gini <= 0.5 ? 'var(--warning-color, #f0883e)' : 'var(--danger-color)';

  // Miembros ordenados por actividad reciente (ultimas 12 semanas)
  const membersSortedByRecent = useMemo(() => {
    return [...teamMetrics].sort((a, b) => {
      const aRecent = a.weeklyCommits.reduce((sum, w) => sum + w.commits, 0);
      const bRecent = b.weeklyCommits.reduce((sum, w) => sum + w.commits, 0);
      if (bRecent !== aRecent) return bRecent - aRecent;
      return b.totalCommits - a.totalCommits;
    });
  }, [teamMetrics]);

  // Miembros a mostrar en el grafico de lineas semanal
  const displayLineMembers = useMemo(() => {
    if (selectedLineMembers.length > 0) {
      return teamMetrics.filter((m) => selectedLineMembers.includes(m.login));
    }
    if (teamMetrics.length <= 5) return membersSortedByRecent;
    return membersSortedByRecent.slice(0, lineLimit);
  }, [teamMetrics, membersSortedByRecent, selectedLineMembers, lineLimit]);

  // Datos para grafico de lineas (actividad semanal superpuesta)
  const sampleWeeks = useMemo(() => {
    return teamMetrics.find((m) => m.weeklyCommits.length > 0)?.weeklyCommits ?? [];
  }, [teamMetrics]);

  const lineData = useMemo(() => {
    return sampleWeeks.map((sample, i) => {
      const point: Record<string, string | number> = {
        week: sample.week,
        dateRange: sample.dateRange,
      };
      displayLineMembers.forEach((m) => {
        point[m.login] = m.weeklyCommits[i]?.commits ?? 0;
      });
      return point;
    });
  }, [sampleWeeks, displayLineMembers]);

  // Datos para grafico de barras comparativo (limitado para no saturar con 50+ miembros)
  const displayBarMetrics = useMemo(() => {
    if (barMemberLimit === 0 || teamMetrics.length <= barMemberLimit) return teamMetrics;
    return teamMetrics.slice(0, barMemberLimit);
  }, [teamMetrics, barMemberLimit]);

  const barData = useMemo(() => {
    return displayBarMetrics.map((m: TeamMemberMetrics) => ({
      name: m.login.length > 12 ? m.login.slice(0, 12) + '...' : m.login,
      fullName: m.login,
      Commits: m.totalCommits,
      'Lineas+': m.linesAdded,
      'Lineas-': m.linesDeleted,
    }));
  }, [displayBarMetrics]);

  // Filtro de tarjetas de colaboradores
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMetrics;
    const q = searchQuery.toLowerCase();
    return teamMetrics.filter((m) => m.login.toLowerCase().includes(q));
  }, [teamMetrics, searchQuery]);

  const displayedCardMembers = useMemo(() => {
    if (searchQuery.trim()) return filteredMembers;
    return filteredMembers.slice(0, visibleCardsCount);
  }, [filteredMembers, searchQuery, visibleCardsCount]);

  if (loading) return <p style={{ padding: '2rem' }}>Cargando equipo...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Rendimiento y Productividad del Equipo</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Métricas individuales por colaborador, alertas de sobrecarga y balance de esfuerzo en el proyecto.
        </p>
      </div>

      {/* KPIs globales de equipo */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Colaboradores Registrados</span>
            <Users size={18} />
          </div>
          <div className="metric-value">{teamMetrics.length}</div>
          <div className="metric-trend trend-up">
            <span>Personal activo en el repositorio</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Distribucion del Trabajo</span>
            <AlertTriangle size={18} style={{ color: equityColor }} />
          </div>
          <div className="metric-value" style={{ fontSize: '1.4rem', color: equityColor }}>
            {equityText}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Indice de Gini: {gini.toFixed(2)} (0 = perfecto, 1 = concentrado)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Alerta de Sobrecarga</span>
            <AlertCircle size={18} style={{ color: 'var(--danger-color)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--danger-color)' }}>
            {teamMetrics.filter((m) => m.overloadIndex >= 1).length}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Desarrolladores con &gt;=3 issues o PRs sin resolver</span>
          </div>
        </div>
      </div>

      {/* Buscador y paginacion de tarjetas de miembros */}
      {teamMetrics.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.75rem 1.2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre de usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '0.85rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>
              Mostrando {displayedCardMembers.length} de {filteredMembers.length} colaboradores
            </span>
            {!searchQuery.trim() && visibleCardsCount < filteredMembers.length && (
              <button
                type="button"
                onClick={() => setVisibleCardsCount((prev) => prev + 12)}
                style={{
                  background: 'rgba(88,166,255,0.1)',
                  border: '1px solid rgba(88,166,255,0.3)',
                  color: 'var(--accent-color)',
                  borderRadius: '6px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cargar más (+12)
              </button>
            )}
            {!searchQuery.trim() && visibleCardsCount < filteredMembers.length && (
              <button
                type="button"
                onClick={() => setVisibleCardsCount(filteredMembers.length)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tarjetas individuales de colaboradores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {displayedCardMembers.map((member, idx) => (
          <div
            key={member.login}
            className="metric-card"
            style={{
              flexDirection: 'column',
              gap: '1rem',
              borderLeft: `3px solid ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`,
            }}
          >
            {/* Header del miembro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={member.avatar_url}
                alt={member.login}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: `2px solid ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`,
                }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, color: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}>
                  {member.login}
                </h4>
                {member.overloadIndex >= 1 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      marginTop: '0.3rem',
                      fontSize: '0.75rem',
                      background: 'rgba(248,81,73,0.15)',
                      color: 'var(--danger-color)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={12} />
                    Sobrecarga detectada
                  </div>
                )}
              </div>
            </div>

            {/* Metricas del miembro */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GitGraph size={14} style={{ color: 'var(--success-color)' }} />
                <span>
                  <strong>{member.totalCommits}</strong> commits
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code size={14} style={{ color: '#58a6ff' }} />
                <span style={{ color: '#3fb950' }}>+{formatNumber(member.linesAdded)}</span>
                <span style={{ color: '#f85149' }}>-{formatNumber(member.linesDeleted)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle
                  size={14}
                  style={{ color: member.issuesAssigned >= 3 ? 'var(--danger-color)' : 'var(--text-secondary)' }}
                />
                <span>{member.issuesAssigned} issues abiertas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={14} style={{ color: 'var(--success-color)' }} />
                <span>{member.issuesClosed} issues resueltas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GitPullRequest size={14} style={{ color: '#bc8cff' }} />
                <span>
                  {member.prsCreated} PRs ({member.prsMerged} mergeadas)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                <span>
                  {member.activeWeeks} / {member.totalWeeks} semanas activas
                </span>
              </div>
            </div>

            {/* Mini grafico de actividad semanal */}
            {member.weeklyCommits.length > 0 && (
              <div style={{ marginTop: '0.6rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span>Ritmo semanal (últimas 12 semanas)</span>
                  <span style={{ fontWeight: 600 }}>
                    {member.weeklyCommits.reduce((s, w) => s + w.commits, 0)} commits recientes
                  </span>
                </div>
                <div style={{ height: '70px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={member.weeklyCommits}
                      margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
                    >
                      <XAxis dataKey="dateRange" hide />
                      <Bar
                        dataKey="commits"
                        fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                        radius={[2, 2, 0, 0]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#161b22',
                          border: '1px solid #30363d',
                          borderRadius: '6px',
                          color: '#c9d1d9',
                          fontSize: '0.8rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          padding: '6px 10px',
                        }}
                        formatter={(value: any) => [
                          `${value} ${Number(value) === 1 ? 'commit' : 'commits'}`,
                          'Actividad',
                        ]}
                        labelFormatter={(label: any) => `Semana: ${label}`}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Graficos agregados del equipo */}
      {teamMetrics.length > 0 && (
        <div className="charts-grid">
          {/* Contribuciones por persona */}
          <div className="chart-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} style={{ color: 'var(--accent-color)' }} />
                <h4 style={{ margin: 0 }}>Contribuciones Consolidadas por Desarrollador</h4>
              </div>
              {teamMetrics.length > 8 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mostrar:</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[10, 20, 0].map((lim) => (
                      <button
                        key={lim}
                        type="button"
                        onClick={() => setBarMemberLimit(lim)}
                        style={{
                          background: barMemberLimit === lim ? 'var(--accent-color)' : 'rgba(255,255,255,0.06)',
                          color: barMemberLimit === lim ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid ' + (barMemberLimit === lim ? 'var(--accent-color)' : 'var(--border-color)'),
                          borderRadius: '6px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {lim === 0 ? `Todos (${teamMetrics.length})` : `Top ${lim}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" fontSize={11} interval={0} />
                <YAxis stroke="#8b949e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#c9d1d9',
                  }}
                  formatter={(value: any, name: any) => [
                    `${formatNumber(Number(value))}`,
                    name,
                  ]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                />
                <Legend />
                <Bar dataKey="Commits" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lineas+" fill="#3fb950" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lineas-" fill="#f85149" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Actividad semanal superpuesta */}
          <div className="chart-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: '#bc8cff' }} />
                <h4 style={{ margin: 0 }}>Ritmo de Commits Semanal por Miembro (ultimas 12 semanas)</h4>
              </div>

              {teamMetrics.length > 5 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {[5, 10, 15].map((lim) => (
                      <button
                        key={lim}
                        type="button"
                        onClick={() => {
                          setLineLimit(lim);
                          setSelectedLineMembers([]);
                        }}
                        style={{
                          background: lineLimit === lim && selectedLineMembers.length === 0 ? '#bc8cff' : 'rgba(255,255,255,0.06)',
                          color: lineLimit === lim && selectedLineMembers.length === 0 ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid ' + (lineLimit === lim && selectedLineMembers.length === 0 ? '#bc8cff' : 'var(--border-color)'),
                          borderRadius: '6px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Top {lim}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowMemberSelector(!showMemberSelector)}
                      style={{
                        background: selectedLineMembers.length > 0 ? 'rgba(188,140,255,0.15)' : 'rgba(255,255,255,0.06)',
                        color: selectedLineMembers.length > 0 ? '#bc8cff' : 'var(--text-secondary)',
                        border: '1px solid ' + (selectedLineMembers.length > 0 ? '#bc8cff' : 'var(--border-color)'),
                        borderRadius: '6px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Filter size={12} />
                      {selectedLineMembers.length > 0
                        ? `${selectedLineMembers.length} seleccionados`
                        : 'Filtrar miembros'}
                    </button>

                    {showMemberSelector && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '0.4rem',
                          background: '#161b22',
                          border: '1px solid #30363d',
                          borderRadius: '8px',
                          padding: '0.6rem',
                          zIndex: 50,
                          width: '260px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar miembros</span>
                          {selectedLineMembers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedLineMembers([])}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-color)',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar colaborador..."
                          value={memberFilterInput}
                          onChange={(e) => setMemberFilterInput(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0d1117',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            color: '#c9d1d9',
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.5rem',
                            marginBottom: '0.5rem',
                            outline: 'none',
                          }}
                        />
                        <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {membersSortedByRecent
                            .filter((m) => m.login.toLowerCase().includes(memberFilterInput.toLowerCase()))
                            .slice(0, 50)
                            .map((m) => {
                              const isChecked = selectedLineMembers.includes(m.login);
                              return (
                                <label
                                  key={m.login}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    padding: '0.2rem',
                                    borderRadius: '4px',
                                    background: isChecked ? 'rgba(188,140,255,0.1)' : 'transparent',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedLineMembers(selectedLineMembers.filter((l) => l !== m.login));
                                      } else {
                                        if (selectedLineMembers.length >= 15) return;
                                        setSelectedLineMembers([...selectedLineMembers, m.login]);
                                      }
                                    }}
                                  />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.login}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.8rem 0' }}>
              {selectedLineMembers.length > 0
                ? `Mostrando ${displayLineMembers.length} colaboradores seleccionados manualmente.`
                : `Mostrando los ${displayLineMembers.length} colaboradores más activos en las últimas 12 semanas.`}
            </p>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="week" stroke="#8b949e" fontSize={11} />
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
                  labelFormatter={(_label, payload) => {
                    const dateRange = payload?.[0]?.payload?.dateRange;
                    return dateRange ? `Semana: ${dateRange}` : `Semana: ${_label}`;
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} ${Number(value) === 1 ? 'commit' : 'commits'}`,
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    maxHeight: '60px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingTop: '6px',
                    fontSize: '0.75rem',
                  }}
                />
                {displayLineMembers.map((m, i) => (
                  <Line
                    key={m.login}
                    type="monotone"
                    dataKey={m.login}
                    stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {teamMetrics.length === 0 && (
        <div className="chart-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No se encontraron datos analiticos de colaboradores para este repositorio.</p>
        </div>
      )}
    </div>
  );
}
