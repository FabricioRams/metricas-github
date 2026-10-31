/**
 * RepoSelectorModal — Modal inteligente y buscador rapido de repositorios.
 * Reemplaza el dropdown estatico por un explorador completo con busqueda en tiempo real,
 * filtros por origen (Mis Repositorios / Destacados), visibilidad y lenguaje.
 * Sin emojis y sin Power BI.
 */
import { useState, useMemo } from 'react';
import {
  Search,
  X,
  FolderGit2,
  Lock,
  Globe,
  Star,
  GitFork,
  Check,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { FEATURED_REPOSITORIES } from '../services/github';

interface RepoItem {
  id: string | number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
  isMyRepo?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (fullName: string) => void;
  myRepos: any[];
  loadingRepos: boolean;
  isAuthenticated: boolean;
  currentRepoName?: string;
}

export default function RepoSelectorModal({
  isOpen,
  onClose,
  onSelectRepo,
  myRepos,
  loadingRepos,
  isAuthenticated,
  currentRepoName,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'featured' | 'public' | 'private'>(
    isAuthenticated && myRepos.length > 0 ? 'mine' : 'all'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Consolidar lista unificada de repositorios
  const allReposList = useMemo<RepoItem[]>(() => {
    const list: RepoItem[] = [];

    // 1. Repositorios del usuario autenticado
    myRepos.forEach((r) => {
      list.push({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        private: Boolean(r.private),
        language: r.language || null,
        stargazers_count: r.stargazers_count || 0,
        forks_count: r.forks_count || 0,
        updated_at: r.updated_at,
        isMyRepo: true,
      });
    });

    // 2. Repositorios destacados predefinidos
    FEATURED_REPOSITORIES.forEach((f) => {
      if (!list.some((existing) => existing.full_name.toLowerCase() === f.full_name.toLowerCase())) {
        list.push({
          id: f.full_name,
          name: f.name,
          full_name: f.full_name,
          description: f.description,
          private: false,
          language: f.language,
          stargazers_count: undefined,
          forks_count: undefined,
          isMyRepo: false,
        });
      }
    });

    return list;
  }, [myRepos]);

  // Extraer lista de lenguajes disponibles
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    allReposList.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set).sort();
  }, [allReposList]);

  // Filtrado reactivo en tiempo real
  const filteredRepos = useMemo(() => {
    return allReposList.filter((repo) => {
      // Filtro por pestana
      if (activeTab === 'mine' && !repo.isMyRepo) return false;
      if (activeTab === 'featured' && repo.isMyRepo) return false;
      if (activeTab === 'public' && repo.private) return false;
      if (activeTab === 'private' && !repo.private) return false;

      // Filtro por lenguaje
      if (selectedLanguage !== 'all' && repo.language !== selectedLanguage) return false;

      // Filtro por texto de busqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = repo.name.toLowerCase().includes(query);
        const matchFullName = repo.full_name.toLowerCase().includes(query);
        const matchDesc = repo.description?.toLowerCase().includes(query) ?? false;
        const matchLang = repo.language?.toLowerCase().includes(query) ?? false;
        if (!matchName && !matchFullName && !matchDesc && !matchLang) return false;
      }

      return true;
    });
  }, [allReposList, activeTab, selectedLanguage, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (fullName: string) => {
    onSelectRepo(fullName);
    onClose();
  };

  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query.includes('/')) {
      handleSelect(query);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderGit2 size={22} style={{ color: 'var(--accent-color)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Explorador de Repositorios</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Filtra entre tus proyectos de GitHub o selecciona proyectos destacados para analizar
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Cerrar ventana">
            <X size={18} />
          </button>
        </div>

        {/* Barra de busqueda rapida en vivo */}
        <form onSubmit={handleDirectSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="search-bar-inner" style={{ flex: 1 }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              autoFocus
              placeholder="Buscar por nombre, taller, tarea, tecnología o pega un 'owner/repo'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery.includes('/') && (
            <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }}>
              Analizar
            </button>
          )}
        </form>

        {/* Pildoras de filtros de origen */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.8rem' }}>
          <button
            className={`filter-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({allReposList.length})
          </button>

          {isAuthenticated && (
            <button
              className={`filter-pill ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              Mis Repositorios ({myRepos.length})
            </button>
          )}

          <button
            className={`filter-pill ${activeTab === 'featured' ? 'active' : ''}`}
            onClick={() => setActiveTab('featured')}
          >
            <Sparkles size={13} />
            Destacados ({FEATURED_REPOSITORIES.length})
          </button>

          {isAuthenticated && myRepos.some((r) => r.private) && (
            <button
              className={`filter-pill ${activeTab === 'private' ? 'active' : ''}`}
              onClick={() => setActiveTab('private')}
            >
              <Lock size={12} />
              Privados
            </button>
          )}

          {/* Filtro por lenguaje */}
          {availableLanguages.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="select-filter"
              >
                <option value="all">Todos los lenguajes</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mensaje de carga o estado */}
        {loadingRepos && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
            Consultando repositorios en GitHub...
          </p>
        )}

        {/* Listado scrolleable de repositorios */}
        <div className="modal-repo-list">
          {filteredRepos.map((repo) => {
            const isCurrent = currentRepoName?.toLowerCase() === repo.full_name.toLowerCase();

            return (
              <div
                key={repo.full_name}
                className={`repo-card-item ${isCurrent ? 'active-repo' : ''}`}
                onClick={() => handleSelect(repo.full_name)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {repo.full_name}
                    </span>

                    {repo.private ? (
                      <span className="badge-chip badge-private">
                        <Lock size={11} /> Privado
                      </span>
                    ) : (
                      <span className="badge-chip badge-public">
                        <Globe size={11} /> Público
                      </span>
                    )}

                    {repo.isMyRepo && (
                      <span className="badge-chip badge-mine">
                        Tu repositorio
                      </span>
                    )}
                  </div>

                  {repo.description && (
                    <p className="repo-card-description">
                      {repo.description}
                    </p>
                  )}

                  <div className="repo-card-meta">
                    {repo.language && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className="lang-dot" />
                        {repo.language}
                      </span>
                    )}

                    {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} /> {repo.stargazers_count}
                      </span>
                    )}

                    {repo.forks_count !== undefined && repo.forks_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <GitFork size={12} /> {repo.forks_count}
                      </span>
                    )}

                    {repo.updated_at && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Actualizado: {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {isCurrent ? (
                    <span className="active-badge">
                      <Check size={14} /> Seleccionado
                    </span>
                  ) : (
                    <button className="btn-select-repo">
                      Cargar <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRepos.length === 0 && !loadingRepos && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <Search size={36} style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No se encontraron repositorios</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0.4rem auto 0' }}>
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}". Puedes presionar 'Analizar' si deseas buscar directamente en GitHub.`
                  : 'No hay repositorios disponibles con los filtros actuales.'}
              </p>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Mostrando {filteredRepos.length} repositorio{filteredRepos.length === 1 ? '' : 's'}
          </span>
          <button className="btn-outline" onClick={onClose} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
