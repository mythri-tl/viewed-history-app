import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';

const MessagingView = ({ currentUser, socket, selectedContact }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

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
        />
      )}
    </div>
  );
};

export default MessagingView;
