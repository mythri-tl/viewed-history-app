import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import ConnectionCard from './ConnectionCard';

const ConnectionsView = ({ onTabChange, onSelectContact }) => {
  const [connections, setConnections] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchConnectionsData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [listRes, suggRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/connections/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/connections/suggestions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const listData = await listRes.json();
      const suggData = await suggRes.json();

      if (listRes.ok) {
        setConnections(listData.connections || []);
        setIncoming(listData.incoming || []);
      }
      if (suggRes.ok) {
        setSuggestions(suggData.suggestions || []);
      }
    } catch (e) {
      console.error("Failed to load connections details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConnectionsData();
  }, []);

  const handleAction = async (actionType, userId) => {
    const token = localStorage.getItem('token');
    let endpoint = '';
    let body = {};

    if (actionType === 'request') {
      endpoint = `${API_BASE_URL}/api/connections/request`;
      body = { receiver_id: userId };
    } else if (actionType === 'accept') {
      endpoint = `${API_BASE_URL}/api/connections/accept`;
      body = { requester_id: userId };
    } else if (actionType === 'reject') {
      endpoint = `${API_BASE_URL}/api/connections/reject`;
      body = { requester_id: userId };
    } else if (actionType === 'message') {
      // Switch view to messaging and pre-select this user
      const targetUser = connections.find(c => c.id === userId);
      if (targetUser) {
        if (onSelectContact) {
          onSelectContact(targetUser);
        }
        onTabChange('messaging');
      }
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        fetchConnectionsData(); // Refresh datasets
      } else {
        setFeedback({ type: 'error', message: data.message || 'Action failed' });
      }
    } catch (e) {
      console.error("Connection action failed:", e);
      setFeedback({ type: 'error', message: 'Network request failure' });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="connections-view" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {feedback && (
        <div 
          className="glass feedback-alert" 
          style={{ padding: '12px 20px', borderRadius: 'var(--border-radius-sm)', background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: feedback.type === 'success' ? '1px solid var(--success)' : '1px solid var(--danger)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', fontSize: '0.9rem' }}
        >
          {feedback.message}
        </div>
      )}

      {/* Incoming Connection Invites Section */}
      {incoming.length > 0 && (
        <section>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <i className="fa-solid fa-clock" style={{ color: 'var(--primary-blue)', fontSize: '1.2rem' }}></i>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Pending Invitations ({incoming.length})</h2>
          </div>
          <div 
            className="connections-grid" 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}
          >
            {incoming.map(user => (
              <ConnectionCard 
                key={user.id} 
                user={user} 
                status="pending_incoming" 
                onAction={handleAction} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Active Connections List */}
      <section>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <i className="fa-solid fa-user-group" style={{ color: 'var(--primary-blue)', fontSize: '1.2rem' }}></i>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Your Connections ({connections.length})</h2>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-blue)' }}></i>
          </div>
        ) : connections.length > 0 ? (
          <div 
            className="connections-grid" 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}
          >
            {connections.map(user => (
              <ConnectionCard 
                key={user.id} 
                user={user} 
                status="accepted" 
                onAction={handleAction} 
              />
            ))}
          </div>
        ) : (
          <div className="glass empty-connections" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-users" style={{ fontSize: '36px', marginBottom: '12px', color: '#cbd5e1' }}></i>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>Build your active network</h3>
            <p style={{ fontSize: '0.85rem' }}>Send connection requests to suggested professionals below to get started.</p>
          </div>
        )}
      </section>

      {/* Suggested Connections Recommendation Grid */}
      <section>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--primary-blue)', fontSize: '1.2rem' }}></i>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Suggested Connections</h2>
        </div>
        
        {suggestions.length > 0 ? (
          <div 
            className="connections-grid" 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}
          >
            {suggestions.map(user => (
              <ConnectionCard 
                key={user.id} 
                user={user} 
                status="suggestion" 
                onAction={handleAction} 
              />
            ))}
          </div>
        ) : (
          <div className="glass" style={{ textAlign: 'center', padding: '30px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No suggestions available right now. You're fully connected!
          </div>
        )}
      </section>
    </div>
  );
};

export default ConnectionsView;
