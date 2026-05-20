const Sidebar = ({ onLogout, user, activeTab, onTabChange }) => {
  const displayName = user?.name || "Professional User";
  // For a generated avatar based on the name or fallback
  const avatarUrl = user?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0a66c2&color=fff`;

  return (
    <nav className="sidebar glass">
      <div className="logo">
        <i className="fa-solid fa-arrows-to-eye" style={{ color: 'var(--primary-blue)', fontSize: '32px' }}></i>
      </div>
      <ul className="nav-links">
        <li className={activeTab === 'home' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('home'); }}>
            <i className="fa-solid fa-house"></i> Home
          </a>
        </li>
        <li className={activeTab === 'connections' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('connections'); }}>
            <i className="fa-solid fa-user-group"></i> Connections
          </a>
        </li>
        <li className={activeTab === 'jobs' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('jobs'); }}>
            <i className="fa-solid fa-briefcase"></i> Jobs
          </a>
        </li>
        <li className={activeTab === 'messaging' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('messaging'); }}>
            <i className="fa-solid fa-message"></i> Messaging
          </a>
        </li>
        <li className={activeTab === 'notifications' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('notifications'); }}>
            <i className="fa-solid fa-bell"></i> Notifications
          </a>
        </li>
        <li className={activeTab === 'history' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); onTabChange('history'); }}>
            <i className="fa-solid fa-clock-rotate-left"></i> View History
          </a>
        </li>
      </ul>
      
      <div className="user-profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <img src={avatarUrl} alt="User Avatar" className="avatar" />
          <div className="user-info">
            <h4 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{displayName}</h4>
            <p>Member</p>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} style={{ marginTop: '12px', width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', transition: 'all 0.2s ease' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
