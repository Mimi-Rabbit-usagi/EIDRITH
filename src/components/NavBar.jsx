import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { path: '/play',    label: '対局',  icon: '♟' },
  { path: '/learn',   label: '学習',  icon: '📖' },
  { path: '/puzzles', label: 'パズル', icon: '♞' },
  { path: '/profile', label: '成績',  icon: '👤' },
];

export default function NavBar() {
  const { pathname } = useLocation();

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
    </nav>
  );
}
