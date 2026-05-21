import { API_BASE_URL } from './config';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProductivityWidgets from './components/ProductivityWidgets';
import PostCard from './components/PostCard';
import InsightsPanel from './components/InsightsPanel';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import PrivacyModal from './components/PrivacyModal';
import Login from './components/Login';
import CreatePost from './components/CreatePost';
import ConnectionsView from './components/ConnectionsView';
import JobsView from './components/JobsView';
import MessagingView from './components/MessagingView';
import NotificationsView from './components/NotificationsView';
import SearchResults from './components/SearchResults';
import { io } from 'socket.io-client';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'history' | 'connections' | 'jobs' | 'messaging' | 'notifications' | 'search'
  
  const [posts, setPosts] = useState([]);
  const [historyPosts, setHistoryPosts] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [completionFilter, setCompletionFilter] = useState('all'); // 'all' | 'completed' | 'partial'
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all' | 'today' | 'week'

  // AI Insights State
  const [analyticsTopics, setAnalyticsTopics] = useState([]);
  const [analyticsTrends, setAnalyticsTrends] = useState({});
  const [analyticsInsights, setAnalyticsInsights] = useState([]);
  const [analyticsRange, setAnalyticsRange] = useState('week');

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    is_paused: false,
    private_mode: false,
    auto_delete_days: 30
  });

  const fetchHistorySettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/history/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPrivacySettings(data.settings);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const fetchAnalytics = async (range = analyticsRange) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const params = new URLSearchParams({ range });
      const [topicsRes, trendsRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/analytics/topics?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/analytics/trends?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/analytics/insights?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const [topicsData, trendsData, insightsData] = await Promise.all([
        topicsRes.json(),
        trendsRes.json(),
        insightsRes.json()
      ]);
      if (topicsRes.ok) setAnalyticsTopics(topicsData.topics || []);
      if (trendsRes.ok) setAnalyticsTrends(trendsData.trends || {});
      if (insightsRes.ok) setAnalyticsInsights(insightsData.insights || []);
    } catch (e) {
      console.error("Failed to load analytics", e);
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data.user);
          setIsLoggedIn(true);
          // Load settings and analytics on successful login
          fetchHistorySettings();
          fetchAnalytics('week');
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyToken();
  }, []);

  // Establish WebSockets client connection for real-time feed, comments, and likes
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const token = localStorage.getItem('token');
    const socketInstance = io(API_BASE_URL || undefined, {
      auth: { token }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket.io] Connected to backend real-time server');
      if (currentUser.id) {
        socketInstance.emit('join', currentUser.id);
      }
    });

    socketInstance.on('post_created', (newPost) => {
      setPosts(prev => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    });

    socketInstance.on('post_liked', ({ postId, likeCount, action, actorUserId }) => {
      setPosts(prev => prev.map(p => {
        if (Number(p.id) === Number(postId)) {
          return { ...p, like_count: likeCount };
        }
        return p;
      }));
      setHistoryPosts(prev => prev.map(p => (
        Number(p.id) === Number(postId) ? { ...p, like_count: likeCount } : p
      )));
      // Dispatch global window event to update individual card like states if desired
      window.dispatchEvent(new CustomEvent(`post-like-update-${postId}`, {
        detail: { likeCount, action, actorUserId }
      }));
    });

    socketInstance.on('comment_created', ({ postId, comment, commentCount }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comment_count: commentCount };
        }
        return p;
      }));
      // Dispatch event to dynamic comment drawer in PostCard
      window.dispatchEvent(new CustomEvent(`new-comment-${postId}`, { detail: comment }));
    });

    socketInstance.on('comment_updated', ({ postId, comment, commentCount }) => {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: commentCount } : p));
      window.dispatchEvent(new CustomEvent(`comment-update-${postId}`, { detail: comment }));
    });

    socketInstance.on('comment_deleted', ({ postId, commentId, commentCount }) => {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: commentCount } : p));
      window.dispatchEvent(new CustomEvent(`comment-delete-${postId}`, { detail: { commentId } }));
    });

    socketInstance.on('post_updated', (updatedPost) => {
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
      setHistoryPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
      window.dispatchEvent(new CustomEvent(`post-update-sync-${updatedPost.id}`, { detail: updatedPost }));
    });

    socketInstance.on('post_deleted', ({ postId }) => {
      setPosts(prev => prev.filter(p => Number(p.id) !== Number(postId)));
      setHistoryPosts(prev => prev.filter(p => Number(p.id) !== Number(postId)));
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [isLoggedIn, currentUser]);

  // Fetch feed or history based on activeTab and filters
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab !== 'home' && activeTab !== 'history') return;
    
    const fetchContent = async () => {
      setLoadingContent(true);
      try {
        const token = localStorage.getItem('token');
        
        let endpoint = `${API_BASE_URL}/api/posts?limit=10`;
        if (activeTab === 'home' && privacySettings.filter_read_posts) {
          endpoint = `${API_BASE_URL}/api/posts?limit=10&excludeViewed=true`;
        } else if (activeTab === 'history') {
          const params = new URLSearchParams();
          if (searchQuery) params.append('q', searchQuery);
          if (authorQuery) params.append('author', authorQuery);
          if (completionFilter !== 'all') params.append('completed', completionFilter === 'completed' ? 'true' : 'false');
          if (dateRangeFilter !== 'all') params.append('dateRange', dateRangeFilter);
          endpoint = `${API_BASE_URL}/api/history?${params.toString()}`;
        }
        
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
          if (activeTab === 'home') {
            setPosts(data.posts || []);
          } else {
            setHistoryPosts(data.history || []);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${activeTab}:`, error);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [isLoggedIn, activeTab, searchQuery, authorQuery, completionFilter, dateRangeFilter, privacySettings.filter_read_posts]);

  // URL routing synchronization effect
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/connections') {
        setActiveTab('connections');
      } else if (path === '/jobs') {
        setActiveTab('jobs');
      } else if (path === '/messages') {
        setActiveTab('messaging');
      } else if (path === '/notifications') {
        setActiveTab('notifications');
      } else if (path === '/search') {
        setActiveTab('search');
      } else if (path === '/history') {
        setActiveTab('history');
      } else {
        setActiveTab('home');
      }
    };

    // Run once on load
    handleLocationChange();

    // Listen for history popstate events
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Update URL pathname whenever activeTab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    let path = '/';
    if (tab === 'connections') path = '/connections';
    else if (tab === 'jobs') path = '/jobs';
    else if (tab === 'messaging') path = '/messages';
    else if (tab === 'notifications') path = '/notifications';
    else if (tab === 'history') path = '/history';
    else if (tab === 'search') path = window.location.pathname === '/search' ? `/search${window.location.search}` : '/search';
    
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  const handleHeaderSearch = (query) => {
    const params = new URLSearchParams({ q: query, type: 'all' });
    const path = `/search?${params.toString()}`;
    setActiveTab('search');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('searchchange'));
  };

  // Refresh analytics whenever the user navigates back to History or clears it
  useEffect(() => {
    if (isLoggedIn && activeTab === 'history') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics(analyticsRange);
    }
  }, [activeTab, isLoggedIn, analyticsRange]);

  useEffect(() => {
    if (!isLoggedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics(analyticsRange);
  }, [analyticsRange, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId = null;
    const handleHistoryViewTracked = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        fetchAnalytics(analyticsRange);
      }, 6500);
    };

    window.addEventListener('history-view-tracked', handleHistoryViewTracked);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('history-view-tracked', handleHistoryViewTracked);
    };
  }, [analyticsRange, isLoggedIn]);

  if (isCheckingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-gradient)' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', color: 'var(--primary-blue)' }}></i>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPosts([]);
    setHistoryPosts([]);
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => {
      if (prev.some(p => p.id === newPost.id)) return prev;
      const postWithAuthor = {
        ...newPost,
        author_name: newPost.author_name || currentUser.name,
        author_image: newPost.author_image || currentUser.profile_image,
        like_count: newPost.like_count || 0,
        comment_count: newPost.comment_count || 0,
        created_at: newPost.created_at || new Date().toISOString()
      };
      return [postWithAuthor, ...prev];
    });
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(post => Number(post.id) !== Number(postId)));
    setHistoryPosts(prev => prev.filter(post => Number(post.id) !== Number(postId)));
  };

  const handleUpdateSettings = async (newSettings) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/history/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (res.ok) {
        setPrivacySettings(data.settings);
      }
    } catch (e) {
      console.error("Failed to update settings", e);
    }
  };

  const handleClearHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryPosts([]);
        setAnalyticsTopics([]);
        setAnalyticsTrends({});
        setAnalyticsInsights([]);
      }
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  // Group history by date loosely
  const todayHistory = historyPosts.filter(p => new Date(p.viewed_at).toDateString() === new Date().toDateString());
  const yesterdayHistory = historyPosts.filter(p => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return new Date(p.viewed_at).toDateString() === yesterday.toDateString();
  });
  const olderHistory = historyPosts.filter(p => {
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const dStr = new Date(p.viewed_at).toDateString();
    return dStr !== todayStr && dStr !== yesterdayStr;
  });

  const handleResumeReading = (postId) => {
    setActiveTab('home');
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.borderLeftColor = 'var(--primary-blue)';
        element.style.boxShadow = '0 0 16px rgba(10, 102, 194, 0.4)';
        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
          element.style.boxShadow = '';
          element.style.transform = '';
        }, 2000);
      }
    }, 100);
  };

  return (
    <div className="app-container">
      <Sidebar 
        onLogout={handleLogout} 
        user={currentUser} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <main className="main-content">
        <Header
          activeTab={activeTab}
          onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          onSearch={handleHeaderSearch}
        />

        <div className="content-scrollable">
          <ProductivityWidgets 
            historyPosts={historyPosts} 
            onResumeReading={handleResumeReading} 
            onTabChange={handleTabChange} 
          />

          <section className="timeline-section" style={{ marginTop: '24px' }}>
            {activeTab === 'home' && <CreatePost onPostCreated={handlePostCreated} />}

            {/* Premium Dynamic Filter Toolbar strictly for History tab */}
            {activeTab === 'history' && (
              <div className="glass filters-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search content or #hashtags..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <i className="fa-solid fa-user" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                  <input 
                    type="text" 
                    placeholder="Filter by author..." 
                    value={authorQuery}
                    onChange={e => setAuthorQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', minWidth: '240px' }}>
                  <select 
                    className="glass-select" 
                    value={completionFilter}
                    onChange={e => setCompletionFilter(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'white', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="all">All Reads</option>
                    <option value="completed">Fully Read (&gt;3s)</option>
                    <option value="partial">Partially Read</option>
                  </select>
                  <select 
                    className="glass-select" 
                    value={dateRangeFilter}
                    onChange={e => setDateRangeFilter(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'white', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="all">Anytime</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                  </select>
                </div>
                {(searchQuery || authorQuery || completionFilter !== 'all' || dateRangeFilter !== 'all') && (
                  <button 
                    onClick={() => { setSearchQuery(''); setAuthorQuery(''); setCompletionFilter('all'); setDateRangeFilter('all'); }} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-blue)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {(activeTab === 'home' || activeTab === 'history') && (
              <div className="timeline-header" style={{ marginBottom: '16px' }}>
                <div className="timeline-dot"></div>
                <h2>{activeTab === 'home' ? 'Recent Feed' : 'Viewed History'}</h2>
              </div>
            )}
            
            {loadingContent ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-blue)' }}></i>
              </div>
            ) : (
              <div className="post-cards">
                {activeTab === 'connections' && (
                  <ConnectionsView 
                    onTabChange={handleTabChange} 
                    onSelectContact={setSelectedContact} 
                  />
                )}

                {activeTab === 'jobs' && (
                  <JobsView socket={socket} />
                )}

                {activeTab === 'messaging' && (
                  <MessagingView 
                    currentUser={currentUser} 
                    socket={socket} 
                    selectedContact={selectedContact} 
                  />
                )}

                {activeTab === 'notifications' && (
                  <NotificationsView socket={socket} />
                )}

                {activeTab === 'search' && (
                  <SearchResults
                    currentUser={currentUser}
                    onTabChange={handleTabChange}
                    onSelectContact={setSelectedContact}
                  />
                )}

                {activeTab === 'home' && (
                  posts.length > 0 ? (
                    posts.map(post => (
                      <PostCard 
                        key={post.id} 
                        {...post} 
                        currentUser={currentUser}
                        onDelete={handlePostDeleted}
                        minVisibilityPct={privacySettings.min_visibility_pct}
                        minDurationSeconds={privacySettings.min_duration_seconds}
                      />
                    ))
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-comment-slash" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
                      <h3>Your feed is empty</h3>
                      <p>Be the first to share a post!</p>
                    </div>
                  )
                )}

                {activeTab === 'history' && (
                  <>
                    {todayHistory.length > 0 && (
                      <div className="timeline-group">
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Today</h3>
                        {todayHistory.map(post => (
                          <PostCard 
                            key={`history-${post.id}`} 
                            {...post} 
                            currentUser={currentUser}
                            inHistoryView={true} 
                            onDelete={handlePostDeleted}
                            minVisibilityPct={privacySettings.min_visibility_pct}
                            minDurationSeconds={privacySettings.min_duration_seconds}
                          />
                        ))}
                      </div>
                    )}
                    {yesterdayHistory.length > 0 && (
                      <div className="timeline-group" style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Yesterday</h3>
                        {yesterdayHistory.map(post => (
                          <PostCard 
                            key={`history-${post.id}`} 
                            {...post} 
                            currentUser={currentUser}
                            inHistoryView={true} 
                            onDelete={handlePostDeleted}
                            minVisibilityPct={privacySettings.min_visibility_pct}
                            minDurationSeconds={privacySettings.min_duration_seconds}
                          />
                        ))}
                      </div>
                    )}
                    {olderHistory.length > 0 && (
                      <div className="timeline-group" style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Older</h3>
                        {olderHistory.map(post => (
                          <PostCard 
                            key={`history-${post.id}`} 
                            {...post} 
                            currentUser={currentUser}
                            inHistoryView={true} 
                            onDelete={handlePostDeleted}
                            minVisibilityPct={privacySettings.min_visibility_pct}
                            minDurationSeconds={privacySettings.min_duration_seconds}
                          />
                        ))}
                      </div>
                    )}
                    {historyPosts.length === 0 && (
                      <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
                        <h3>No matching history</h3>
                        <p>Adjust your search query or spend more time reading posts on your feed!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <aside className="right-sidebar">
        <InsightsPanel
          topics={analyticsTopics}
          trends={analyticsTrends}
          insights={analyticsInsights}
          range={analyticsRange}
          onRangeChange={setAnalyticsRange}
        />
        <ArchitectureDiagram />
      </aside>

      <PrivacyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
        onClearHistory={handleClearHistory}
        settings={privacySettings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

export default App;
