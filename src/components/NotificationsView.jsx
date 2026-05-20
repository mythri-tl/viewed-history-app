import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import NotificationItem from './NotificationItem';

const NotificationsView = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, []);

  // Listen for real-time notification alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
    };

    // Socket.io broadcasts are listened to globally
    socket.on('notification_received', handleNewNotification);
    return () => {
      socket.off('notification_received', handleNewNotification);
    };
  }, [socket]);

  const handleMarkRead = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Your Notifications</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keep track of job applications, requests, and comments.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--primary-blue)' }}></i>
        </div>
      ) : notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notif => (
            <NotificationItem 
              key={notif.id} 
              notification={notif} 
              onMarkRead={handleMarkRead} 
            />
          ))}
        </div>
      ) : (
        <div className="glass" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-bell-slash" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
          <h3>No notifications yet</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>You will receive real-time notifications for networking activities here!</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
