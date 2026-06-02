import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_LINKS = [
  { path: '/play',    label: '対局',   icon: '♟' },
  { path: '/online',  label: 'オンライン', icon: '🌐' },
  { path: '/learn',   label: '学習',   icon: '📖' },
  { path: '/puzzles', label: 'パズル',  icon: '♞' },
  { path: '/profile', label: '成績',   icon: '👤' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const avatarEmoji  = localStorage.getItem('chess-avatar-emoji') || '';
  const displayName  = localStorage.getItem('chess-player-name') || user?.user_metadata?.full_name?.split(' ')[0] || 'あなた';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <span className="navbar-logo-icon">♛</span>
        <span className="navbar-logo-text">EIDRITH</span>
      </Link>

      <div className="navbar-links">
        {NAV_LINKS.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`navbar-link${pathname === link.path ? ' navbar-link--active' : ''}`}
          >
            <span className="navbar-link-icon">{link.icon}</span>
            <span className="navbar-link-label">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* ── 認証エリア ── */}
      {!loading && (
        <div className="navbar-auth">
          {user ? (
            <div className="navbar-user">
              <div className="navbar-avatar-emoji">{avatarEmoji || '♟'}</div>
              <span className="navbar-user-name">{displayName}</span>
              <button className="navbar-signout-btn" onClick={signOut} title="ログアウト">
                ↩
              </button>
            </div>
          ) : (
            <button className="navbar-login-btn" onClick={signInWithGoogle}>
              <span>G</span>
              <span>ログイン</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
