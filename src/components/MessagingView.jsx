import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';

const MessagingView = ({ currentUser, socket, selectedContact }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/connections/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setConnections(data.connections || []);
        }
      } catch (e) {
        console.error("Failed to load connections list in MessagingView:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  useEffect(() => {
    if (!socket || !currentUser?.id) return;

    const normalizeIds = (ids = []) => ids.map(id => Number(id)).filter(Number.isFinite);

    const requestPresenceSnapshot = () => {
      socket.emit('join', currentUser.id);
      socket.emit('presence_snapshot');
    };

    const handlePresenceSnapshot = ({ userIds } = {}) => {
      setOnlineUserIds(normalizeIds(userIds));
    };

    const handleUserOnline = ({ userId }) => {
      const normalizedUserId = Number(userId);
      if (!Number.isFinite(normalizedUserId)) return;
      setOnlineUserIds(prev => (
        prev.includes(normalizedUserId) ? prev : [...prev, normalizedUserId]
      ));
    };

    const handleUserOffline = ({ userId }) => {
      const normalizedUserId = Number(userId);
      if (!Number.isFinite(normalizedUserId)) return;
      setOnlineUserIds(prev => prev.filter(id => id !== normalizedUserId));
    };

    socket.on('connect', requestPresenceSnapshot);
    socket.on('presence_snapshot', handlePresenceSnapshot);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    if (socket.connected) {
      requestPresenceSnapshot();
    }

    return () => {
      socket.off('connect', requestPresenceSnapshot);
      socket.off('presence_snapshot', handlePresenceSnapshot);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket, currentUser?.id]);

  return (
    <div className="messaging-view">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Live Messaging</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure real-time chats with your verified professional connections.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--primary-blue)' }}></i>
        </div>
      ) : (
        <ChatWindow 
          key={selectedContact?.id || 'none'}
          connections={connections} 
          currentUser={currentUser} 
          socket={socket} 
          initialContact={selectedContact}
          onlineUserIds={onlineUserIds}
        />
      )}
    </div>
  );
};

export default MessagingView;
