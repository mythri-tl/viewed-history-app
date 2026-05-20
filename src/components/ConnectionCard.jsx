const ConnectionCard = ({ user, status, onAction }) => {
  const displayName = user?.name || "Professional User";
  const avatarUrl = user?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0a66c2&color=fff`;

  return (
    <div className="connection-card glass" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease', minWidth: '180px' }}>
      <img 
        src={avatarUrl} 
        alt={displayName} 
        style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: '2px solid rgba(255, 255, 255, 0.4)' }} 
      />
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
        {displayName}
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
        {user?.email}
      </p>

      <div style={{ marginTop: 'auto', width: '100%' }}>
        {status === 'suggestion' && (
          <button 
            className="action-btn-primary" 
            onClick={() => onAction('request', user.id)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: '500', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Connect
          </button>
        )}

        {status === 'pending_incoming' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="action-btn-primary" 
              onClick={() => onAction('accept', user.id)}
              style={{ flex: 1, padding: '8px 6px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--success)', color: 'white', fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Accept
            </button>
            <button 
              onClick={() => onAction('reject', user.id)}
              style={{ flex: 1, padding: '8px 6px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--danger)', fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Reject
            </button>
          </div>
        )}

        {status === 'accepted' && (
          <button 
            onClick={() => onAction('message', user.id)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--primary-blue)', background: 'rgba(10, 102, 194, 0.05)', color: 'var(--primary-blue)', fontWeight: '500', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <i className="fa-solid fa-message" style={{ marginRight: '6px' }}></i> Message
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionCard;
