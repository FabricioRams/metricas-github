/**
 * App.tsx — Orquestador principal de DevMetrics BI Solutions.
 * Maneja navegacion entre pestanas, autenticacion GitHub OAuth,
 * buscador global, explorador modal de repositorios y renderizado.
 *
 * Sin emojis y sin Power BI.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  GitGraph,
  Users,
  Settings,
  Bell,
  Search,
  LayoutDashboard,
  Calendar,
  LogOut,
  LogIn,
  GitPullRequest,
  ArrowUpDown,
  RefreshCw,
  FolderGit2,
  ChevronDown,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, GithubAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, githubProvider, db } from './firebase';
import { fetchFullRepoData, fetchUserRepos, type FullRepoData } from './services/github';

// Componentes de cada pestaña
import DashboardTab from './components/DashboardTab';
import ComparatorTab from './components/ComparatorTab';
import TeamTab from './components/TeamTab';
import ScheduleTab from './components/ScheduleTab';
import PullRequestsTab from './components/PullRequestsTab';
import SettingsTab from './components/SettingsTab';
import RepoSelectorModal from './components/RepoSelectorModal';

/** Tipo del usuario autenticado */
interface AppUser {
  name: string | null;
  avatar: string | null;
  email: string | null;
  screenName?: string;
}

function App() {
  // ── Estado principal ──
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('facebook/react');
  const [headerInput, setHeaderInput] = useState('');
  const [fullData, setFullData] = useState<FullRepoData | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Modal de selector de repositorios ──
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // ── Autenticación ──
  const [user, setUser] = useState<AppUser | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(sessionStorage.getItem('github_token'));

  // ── Repos del usuario ──
  const [myRepos, setMyRepos] = useState<any[]>([]);

  /**
   * Carga completa de datos del repositorio.
   * Normaliza URLs, llama al servicio y actualiza el estado.
   */
  const loadRepo = useCallback(async (rawQuery: string, token?: string | null) => {
    let query = rawQuery.trim();

    // Normalizar URL completa → owner/repo
    if (query.includes('github.com/')) {
      const parts = query.split('github.com/')[1].split('/');
      if (parts.length >= 2) query = `${parts[0]}/${parts[1].replace('.git', '')}`;
    }

    if (!query.includes('/')) return;

    setSearchQuery(query);
    setHeaderInput('');
    setLoading(true);

    const data = await fetchFullRepoData(query, token);
    setFullData(data);
    setLoading(false);
  }, []);

  // ── Cargar repositorios del usuario en segundo plano cuando hay token ──
  useEffect(() => {
    if (githubToken) {
      setLoadingRepos(true);
      fetchUserRepos(githubToken)
        .then((repos) => {
          setMyRepos(repos);
        })
        .catch((err) => {
          console.warn('Error al cargar repositorios del usuario:', err);
        })
        .finally(() => {
          setLoadingRepos(false);
        });
    } else {
      setMyRepos([]);
    }
  }, [githubToken]);

  // ── Efectos de inicio y autenticación ──
  useEffect(() => {
    loadRepo(searchQuery, githubToken);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const anyUser = currentUser as any;
        setUser({
          name: currentUser.displayName || 'Usuario GitHub',
          avatar: currentUser.photoURL,
          email: currentUser.email,
          screenName: anyUser.reloadUserInfo?.screenName,
        });
      } else {
        setUser(null);
        setGithubToken(null);
        sessionStorage.removeItem('github_token');
        setMyRepos([]);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers de autenticación ──
  const handleLogin = async () => {
    try {
      githubProvider.addScope('repo');
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setGithubToken(token);
        sessionStorage.setItem('github_token', token);
        loadRepo(searchQuery, token);
      }

      await setDoc(
        doc(db, 'users', result.user.uid),
        {
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error en login con GitHub:', error);
      alert('Hubo un error al iniciar sesión con GitHub. Revisa la consola.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('github_token');
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerInput.trim()) {
      loadRepo(headerInput.trim(), githubToken);
    }
  };

  // ── Definición de pestañas para el sidebar ──
  const tabs = [
    { id: 'dashboard', label: 'Dashboard BI', icon: LayoutDashboard },
    { id: 'comparator', label: 'Comparador', icon: ArrowUpDown },
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'schedule', label: 'Cronograma', icon: Calendar },
    { id: 'pullrequests', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="dashboard">
      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GitGraph size={24} />
          </div>
          <div>
            <h1>DevMetrics<br />BI Solutions</h1>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            {tabs.map((tab) => (
              <li
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <main className="main-content">
        {/* ── Header Principal ── */}
        <header className="header">
          <div className="header-title">
            <h2>Panel de Inteligencia de Negocios</h2>
            <p>Análisis en tiempo real del progreso del proyecto</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            {/* Buscador rapido integrado en el header */}
            <form onSubmit={handleHeaderSearchSubmit} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="search-bar-inner" style={{ padding: '0.45rem 0.8rem' }}>
                <Search size={15} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="owner/repo o URL..."
                  value={headerInput}
                  onChange={(e) => setHeaderInput(e.target.value)}
                  style={{
                    width: '180px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </form>

            {/* Badge interactivo del repositorio activo (abre el explorador al hacer clic) */}
            <div
              className="repo-badge"
              onClick={() => setIsRepoModalOpen(true)}
              title="Haz clic para cambiar o explorar repositorios"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <GitGraph size={15} style={{ color: 'var(--accent-color)' }} />
              <span style={{ fontWeight: 600 }}>{searchQuery}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>

            {/* Botón Explorar / Mis Repositorios */}
            <button
              onClick={() => setIsRepoModalOpen(true)}
              className="btn-outline"
              title="Explora tus repositorios o proyectos recomendados"
            >
              <FolderGit2 size={15} />
              {user ? `Mis Repos (${myRepos.length})` : 'Explorar Repos'}
            </button>

            {/* Botón recargar */}
            <button
              onClick={() => loadRepo(searchQuery, githubToken)}
              disabled={loading}
              className="btn-primary"
              title="Actualizar datos del repositorio"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Cargando...' : 'Recargar'}
            </button>

            <div style={{ cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}>
              <Bell size={18} />
            </div>

            {/* Autenticación */}
            {user ? (
              <div
                className="team-members"
                style={{ cursor: 'pointer' }}
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <img
                  src={user.avatar || ''}
                  alt="avatar"
                  style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                />
                <span>{user.screenName || user.name}</span>
                <LogOut size={13} style={{ color: 'var(--danger-color)' }} />
              </div>
            ) : (
              <button onClick={handleLogin} className="btn-primary">
                <LogIn size={15} />
                Iniciar Sesión
              </button>
            )}
          </div>
        </header>

        {/* ── Banner de información del repositorio activo ── */}
        {fullData && (
          <div className="repo-banner">
            <img
              src={fullData.repo.owner.avatar_url}
              alt="Owner"
              style={{ width: '44px', height: '44px', borderRadius: '10px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1rem' }}>
                {fullData.repo.full_name}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {fullData.repo.description || 'Sin descripción'}
              </p>
            </div>
            {fullData.repo.language && (
              <span className="language-badge">{fullData.repo.language}</span>
            )}
          </div>
        )}

        {/* ═══════════════════ CONTENIDO POR PESTAÑA ═══════════════════ */}

        {activeTab === 'dashboard' && fullData && (
          <DashboardTab
            data={fullData}
            loading={loading}
            onSearchRepo={(q) => loadRepo(q, githubToken)}
            onOpenRepoModal={() => setIsRepoModalOpen(true)}
          />
        )}

        {activeTab === 'comparator' && (
          <ComparatorTab
            token={githubToken}
            currentRepo={fullData}
            myRepos={myRepos}
          />
        )}

        {activeTab === 'team' && fullData && (
          <TeamTab data={fullData} loading={loading} />
        )}

        {activeTab === 'schedule' && fullData && (
          <ScheduleTab data={fullData} loading={loading} />
        )}

        {activeTab === 'pullrequests' && fullData && (
          <PullRequestsTab data={fullData} loading={loading} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            searchQuery={searchQuery}
            onChangeRepo={(q) => loadRepo(q, githubToken)}
            loading={loading}
          />
        )}

        {/* Estado: sin datos */}
        {!fullData && !loading && activeTab !== 'comparator' && activeTab !== 'settings' && (
          <div className="chart-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Search size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <h4>No se pudo cargar el repositorio</h4>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0.5rem auto' }}>
              Verifica que el nombre sea correcto o abre el explorador de repositorios para seleccionar un proyecto accesible.
            </p>
            <button
              onClick={() => setIsRepoModalOpen(true)}
              className="btn-primary"
              style={{ marginTop: '0.8rem' }}
            >
              <FolderGit2 size={16} /> Abrir Explorador de Repositorios
            </button>
          </div>
        )}
      </main>

      {/* ═══════════════════ MODAL SELECTOR DE REPOSITORIOS ═══════════════════ */}
      <RepoSelectorModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        onSelectRepo={(fullName) => loadRepo(fullName, githubToken)}
        myRepos={myRepos}
        loadingRepos={loadingRepos}
        isAuthenticated={Boolean(user)}
        currentRepoName={searchQuery}
      />
    </div>
  );
}

export default App;
