import { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  Target,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FullRepoData } from '../services/github';
import type { Milestone } from '../types';

interface Props {
  data: FullRepoData;
  loading: boolean;
}

export default function ScheduleTab({ data, loading }: Props) {
  const [now] = useState(() => Date.now());
  if (loading) return <p style={{ padding: '2rem' }}>Cargando cronograma...</p>;

  const { milestones } = data;

  // Metricas de cronograma
  const openMilestones = milestones.filter((m: Milestone) => m.state === 'open');
  const closedMilestones = milestones.filter((m: Milestone) => m.state === 'closed');
  const overdueMilestones = openMilestones.filter(
    (m: Milestone) => m.due_on && new Date(m.due_on).getTime() < now
  );
  const withoutDate = milestones.filter((m: Milestone) => !m.due_on);

  // Tasa de retraso historica
  const closedWithDate = closedMilestones.filter((m: Milestone) => m.due_on && m.closed_at);
  const closedLate = closedWithDate.filter(
    (m: Milestone) => new Date(m.closed_at!).getTime() > new Date(m.due_on!).getTime()
  );
  const delayRate =
    closedWithDate.length > 0 ? Math.round((closedLate.length / closedWithDate.length) * 100) : 0;

  // Datos para grafico de progreso
  const progressData = milestones.map((m: Milestone) => {
    const total = m.open_issues + m.closed_issues;
    const progress = total === 0 ? 0 : Math.round((m.closed_issues / total) * 100);
    const isOverdue = Boolean(m.due_on && new Date(m.due_on).getTime() < now && m.state === 'open');
    return {
      name: m.title.length > 20 ? m.title.slice(0, 20) + '...' : m.title,
      progreso: progress,
      isOverdue,
      state: m.state,
    };
  });

  const getRiskLevel = (milestone: Milestone) => {
    if (milestone.state === 'closed') {
      return { label: 'Completado', color: '#3fb950', badgeClass: 'badge-success' };
    }
    const total = milestone.open_issues + milestone.closed_issues;
    const progress = total === 0 ? 0 : (milestone.closed_issues / total) * 100;

    if (milestone.due_on) {
      const dueDate = new Date(milestone.due_on);
      const now = new Date();
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        return {
          label: `Atrasado ${Math.abs(daysLeft)} dias`,
          color: '#f85149',
          badgeClass: 'badge-danger',
        };
      }
      if (daysLeft <= 7 && progress < 80) {
        return {
          label: `${daysLeft}d restantes - En riesgo critico`,
          color: '#f85149',
          badgeClass: 'badge-danger',
        };
      }
      if (daysLeft <= 14 && progress < 50) {
        return {
          label: `${daysLeft}d restantes - Requiere atencion`,
          color: '#f0883e',
          badgeClass: 'badge-warning',
        };
      }
      return {
        label: `${daysLeft}d restantes - A tiempo`,
        color: '#3fb950',
        badgeClass: 'badge-success',
      };
    }

    return { label: 'Sin fecha limite estipulada', color: '#8b949e', badgeClass: 'badge-neutral' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Calendar size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Cronograma, Sprints y Prediccion de Cumplimiento</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Seguimiento de hitos con analisis de riesgo, deteccion de retrasos y proyecciones de entrega.
        </p>
      </div>

      {/* KPIs de cronograma */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Milestones</span>
            <Target size={18} />
          </div>
          <div className="metric-value">{milestones.length}</div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>
              {closedMilestones.length} cerrados | {openMilestones.length} activos
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Hitos Atrasados</span>
            <AlertTriangle size={18} style={{ color: 'var(--danger-color)' }} />
          </div>
          <div
            className="metric-value"
            style={{ color: overdueMilestones.length > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}
          >
            {overdueMilestones.length}
          </div>
          <div className="metric-trend trend-down">
            <span>{overdueMilestones.length > 0 ? 'Requiere accion correctiva' : 'Sin hitos vencidos'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Sin Fecha Limite</span>
            <Clock size={18} />
          </div>
          <div
            className="metric-value"
            style={{ color: withoutDate.length > 0 ? '#f0883e' : 'var(--success-color)' }}
          >
            {withoutDate.length}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>{withoutDate.length > 0 ? 'Falta planificacion temporal' : '100% con plazos definidos'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Tasa de Retraso Historica</span>
            <TrendingDown size={18} />
          </div>
          <div
            className="metric-value"
            style={{
              color: delayRate > 50 ? 'var(--danger-color)' : delayRate > 25 ? '#f0883e' : 'var(--success-color)',
            }}
          >
            {delayRate}%
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Hitos cerrados despues de la fecha limite</span>
          </div>
        </div>
      </div>

      {/* Grafico de progreso */}
      {progressData.length > 0 && (
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0 }}>Porcentaje de Avance por Hito</h4>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(220, milestones.length * 52)}>
            <BarChart data={progressData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis type="number" domain={[0, 100]} stroke="#8b949e" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="#8b949e" fontSize={11} width={150} />
              <Tooltip
                contentStyle={{
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#c9d1d9',
                }}
                formatter={(val: any) => [`${val}%`, 'Avance']}
              />
              <Bar dataKey="progreso" radius={[0, 4, 4, 0]}>
                {progressData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.state === 'closed' ? '#3fb950' : entry.isOverdue ? '#f85149' : '#58a6ff'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista detallada de milestones con semaforo de riesgo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {milestones.length > 0 ? (
          milestones.map((milestone: Milestone) => {
            const totalIssues = milestone.open_issues + milestone.closed_issues;
            const progress = totalIssues === 0 ? 0 : Math.round((milestone.closed_issues / totalIssues) * 100);
            const risk = getRiskLevel(milestone);

            return (
              <div key={milestone.id} className="metric-card" style={{ display: 'block' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.05rem' }}>
                      {milestone.title}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                      {milestone.description || 'Sin descripcion definida en GitHub'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background:
                          milestone.state === 'closed' ? 'rgba(63,185,80,0.18)' : 'rgba(88,166,255,0.18)',
                        color: milestone.state === 'closed' ? '#3fb950' : '#58a6ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {milestone.state === 'closed' ? (
                        <>
                          <CheckCircle size={13} />
                          Completado
                        </>
                      ) : (
                        'En ejecucion'
                      )}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div
                  style={{
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Avance de tareas: {progress}%</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {milestone.closed_issues} de {totalIssues} tareas cerradas
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: progress === 100 ? '#3fb950' : risk.color,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>

                {/* Indicador de riesgo y plazo */}
                <div
                  style={{
                    marginTop: '0.9rem',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontWeight: 600,
                      color: risk.color,
                    }}
                  >
                    <ShieldAlert size={14} />
                    {risk.label}
                  </span>
                  {milestone.due_on && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '0.3rem' }} />
                      Vencimiento:{' '}
                      {new Date(milestone.due_on).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="chart-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Calendar size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <p>Este repositorio no registra hitos (Milestones) configurados en GitHub.</p>
          </div>
        )}
      </div>
    </div>
  );
}
