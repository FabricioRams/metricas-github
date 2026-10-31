/**
 * SettingsTab — Configuracion del dashboard.
 * Gestion de repositorio activo, umbrales de alertas y preferencias de BI.
 * Sin Power BI. Sin emojis.
 */
import { useState } from 'react';
import {
  Settings,
  Search,
  Bookmark,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Props {
  searchQuery: string;
  onChangeRepo: (query: string) => void;
  loading: boolean;
}

export default function SettingsTab({ searchQuery, onChangeRepo, loading }: Props) {
  const [repoInput, setRepoInput] = useState(searchQuery);
  const [overloadThreshold, setOverloadThreshold] = useState(
    () => parseInt(localStorage.getItem('overload_threshold') || '3')
  );

  const handleSearch = () => {
    if (repoInput.trim()) {
      onChangeRepo(repoInput.trim());
    }
  };

  const handleOverloadChange = (value: number) => {
    setOverloadThreshold(value);
    localStorage.setItem('overload_threshold', value.toString());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '750px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Settings size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Configuracion del Sistema Analitico</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Ajustes de conexion, repositorio activo y umbrales de alertas predictivas.
        </p>
      </div>

      {/* Cambiar repositorio */}
      <div className="metric-card" style={{ display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <Search size={20} style={{ color: 'var(--accent-color)' }} />
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Repositorio en Analisis</h4>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Ingresa el repositorio que deseas analizar. Puedes usar el formato <code>propietario/repositorio</code> o pegar una URL completa de GitHub.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Ejemplo: facebook/react o https://github.com/owner/repo"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem',
            }}
          />
          <button onClick={handleSearch} disabled={loading} className="btn-primary">
            {loading ? 'Cargando...' : 'Analizar'}
          </button>
        </div>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.8rem',
            background: 'rgba(88,166,255,0.08)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <Info size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong>Repositorios publicos:</strong> Se pueden analizar sin iniciar sesion (limite de 60 req/hora).
            <br />
            <strong>Con sesion GitHub (OAuth):</strong> Limite de 5,000 req/hora y acceso a repositorios privados.
          </div>
        </div>
      </div>

      {/* Umbrales de alertas */}
      <div className="metric-card" style={{ display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <AlertTriangle size={20} style={{ color: '#f0883e' }} />
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Parametros de Deteccion de Sobrecarga</h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Numero de issues abiertos para disparar alerta de sobrecarga por desarrollador:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <input
                type="range"
                min={1}
                max={10}
                value={overloadThreshold}
                onChange={(e) => handleOverloadChange(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--accent-color)',
                  fontSize: '1.1rem',
                  minWidth: '35px',
                  textAlign: 'center',
                }}
              >
                &ge;{overloadThreshold}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Un miembro se marcara con aviso de sobrecarga cuando supere este umbral de tareas simultaneas.
            </p>
          </div>
        </div>
      </div>

      {/* Ficha tecnica del proyecto */}
      <div className="metric-card" style={{ display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <Bookmark size={20} style={{ color: '#bc8cff' }} />
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Ficha Tecnica de DevMetrics BI</h4>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p>
            <strong>DevMetrics BI Solutions</strong> — Monitor de Metricas Analiticas para Repositorios GitHub
          </p>
          <p>
            Plataforma de inteligencia de negocios para ingenieria de software que transforma datos crudos en decisiones ejecutivas de productividad, salud y cumplimiento de cronogramas.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Asignatura: Inteligencia de Negocios (SI-885) — Semestre 2026-II
            <br />
            Universidad Privada de Tacna | Grupo N. 4
          </p>
          <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['React 19', 'TypeScript', 'Vite', 'Recharts', 'Firebase Auth/Firestore', 'GitHub API v3'].map((tech) => (
              <span
                key={tech}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  background: 'rgba(188,140,255,0.1)',
                  border: '1px solid rgba(188,140,255,0.3)',
                  color: '#bc8cff',
                  fontWeight: 500,
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
