import { API_BASE_URL } from '../config';
import { useState, useEffect, useRef } from 'react';

const ChatWindow = ({ connections, currentUser, socket, initialContact, onlineUserIds = [] }) => {
  const [activeContact, setActiveContact] = useState(initialContact || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const messagesEndRef = useRef(null);

  const isUserOnline = (userId) => onlineUserIds.includes(Number(userId));

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when active contact changes
  useEffect(() => {
    if (!activeContact) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${activeContact.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(data.history || []);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeContact]);

  // Socket.io real-time listener for incoming messages
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleReceiveMessage = (msg) => {
      // Check if message belongs to the current open chat conversation
      if (
        activeContact &&
        ((msg.sender_id === currentUser.id && msg.receiver_id === activeContact.id) ||
         (msg.sender_id === activeContact.id && msg.receiver_id === currentUser.id))
      ) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleUserOnline = ({ userId }) => setOnlineUsers(prev => ({ ...prev, [userId]: true }));
    const handleUserOffline = ({ userId }) => setOnlineUsers(prev => ({ ...prev, [userId]: false }));
    const handleOnlineUsers = (users) => {
      if (!Array.isArray(users)) return;
      const onlineMap = {};
      users.forEach(userId => {
        onlineMap[userId] = true;
      });
      setOnlineUsers(onlineMap);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('online_users', handleOnlineUsers);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('online_users', handleOnlineUsers);
    };
  }, [socket, activeContact, currentUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || !socket) return;

    // Emit send_message event to Socket.io backend pipeline
    socket.emit('send_message', {
      senderId: currentUser.id,
      receiverId: activeContact.id,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  return (
    <div className="chat-window glass" style={{ display: 'flex', height: '600px', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* Connections List Sidebar */}
      <div style={{ width: '30%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.2)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Active Chats</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {connections.length > 0 ? (
            connections.map(contact => {
              const displayName = contact.name || "Professional User";
              const avatarUrl = contact.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0a66c2&color=fff`;
              const isSelected = activeContact?.id === contact.id;
              const isOnline = onlineUsers[contact.id] ?? isUserOnline(contact.id);

              return (
                <div 
                  key={contact.id} 
                  onClick={() => setActiveContact(contact)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: isSelected ? 'rgba(10, 102, 194, 0.08)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s', borderLeft: isSelected ? '4px solid var(--primary-blue)' : '4px solid transparent' }}
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)'; }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <img src={avatarUrl} alt={displayName} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div style={{ overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h4>
                    <p style={{ fontSize: '0.75rem', color: isOnline ? 'var(--success)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      &bull; {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-users-slash" style={{ fontSize: '28px', marginBottom: '12px', color: '#cbd5e1' }}></i>
              <p style={{ fontSize: '0.85rem' }}>No connections yet to chat with.</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Conversation Panel */}
      <div style={{ width: '70%', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.1)' }}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.4)' }}>
              <img 
                src={activeContact.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeContact.name)}&background=0a66c2&color=fff`} 
                alt={activeContact.name} 
                style={{ width: '36px', height: '36px', borderRadius: '50%' }} 
              />
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{activeContact.name}</h4>
                <span style={{ fontSize: '0.75rem', color: (onlineUsers[activeContact.id] ?? isUserOnline(activeContact.id)) ? 'var(--success)' : 'var(--text-muted)' }}>
                  &bull; {(onlineUsers[activeContact.id] ?? isUserOnline(activeContact.id)) ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Chat History Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', margin: 'auto' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--primary-blue)', fontSize: '24px' }}></i>
                </div>
              ) : messages.length > 0 ? (
                messages.map(msg => {
                  const isSentByMe = msg.sender_id === currentUser.id;
                  return (
                    <div 
                      key={msg.id} 
                      style={{ display: 'flex', justifyContent: isSentByMe ? 'flex-end' : 'flex-start', width: '100%' }}
                    >
                      <div 
                        style={{ maxWidth: '65%', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', borderTopRightRadius: isSentByMe ? '2px' : 'var(--border-radius-md)', borderTopLeftRadius: !isSentByMe ? '2px' : 'var(--border-radius-md)', background: isSentByMe ? 'var(--primary-blue)' : 'rgba(255,255,255,0.75)', color: isSentByMe ? 'white' : 'var(--text-color)', fontSize: '0.9rem', lineHeight: '1.4', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: isSentByMe ? 'none' : '1px solid rgba(0,0,0,0.04)' }}
                      >
                        <p>{msg.message}</p>
                        <span style={{ display: 'block', textAlign: 'right', fontSize: '0.65rem', color: isSentByMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-comments" style={{ fontSize: '32px', marginBottom: '12px', color: '#cbd5e1' }}></i>
                  <p style={{ fontSize: '0.85rem' }}>No messages yet. Say hello to start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Send Area */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.4)' }}>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem' }}
              />
              <button 
                type="submit" 
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: 'var(--primary-blue)', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
            <i className="fa-solid fa-paper-plane" style={{ fontSize: '56px', marginBottom: '20px', color: 'rgba(10, 102, 194, 0.15)', transform: 'rotate(-20deg)' }}></i>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '8px' }}>Your Messages</h3>
            <p style={{ maxWidth: '320px', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Select a professional connection from the left sidebar list to view conversation logs and chat in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
