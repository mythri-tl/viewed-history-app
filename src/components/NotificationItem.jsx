const NotificationItem = ({ notification, onMarkRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'connection_request':
        return <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary-blue)' }}></i>;
      case 'connection_accept':
        return <i className="fa-solid fa-user-check" style={{ color: 'var(--success)' }}></i>;
      case 'job_application':
        return <i className="fa-solid fa-clipboard-check" style={{ color: '#8b5cf6' }}></i>;
      case 'new_message':
        return <i className="fa-solid fa-comment-dots" style={{ color: '#f59e0b' }}></i>;
      default:
        return <i className="fa-solid fa-bell" style={{ color: 'var(--text-muted)' }}></i>;
    }
  };

  return (
    <div 
      className="notification-item glass" 
      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: notification.is_read ? 'rgba(255, 255, 255, 0.15)' : 'rgba(10, 102, 194, 0.04)', opacity: notification.is_read ? 0.8 : 1, transition: 'all 0.2s', position: 'relative' }}
    >
      {/* Unread indicator dot */}
      {!notification.is_read && (
        <span 
          style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-blue)', position: 'absolute', right: '16px', top: '16px' }} 
        />
      )}

      <div 
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
      >
        {getIcon()}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: notification.is_read ? '500' : '600', lineHeight: '1.4', paddingRight: '24px' }}>
          {notification.message}
        </p>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!notification.is_read && (
        <button 
          onClick={() => onMarkRead(notification.id)}
          style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.05)'; e.currentTarget.style.borderColor = 'var(--primary-blue)'; e.currentTarget.style.color = 'var(--primary-blue)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-color)'; }}
        >
          Mark as Read
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
