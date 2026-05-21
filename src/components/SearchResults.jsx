import { API_BASE_URL } from '../config';
import { useEffect, useMemo, useState } from 'react';
import PostCard from './PostCard';
import ConnectionCard from './ConnectionCard';
import JobCard from './JobCard';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'posts', label: 'Posts' },
  { id: 'people', label: 'People' },
  { id: 'jobs', label: 'Jobs' }
];

const SearchResults = ({ currentUser, onTabChange, onSelectContact }) => {
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search));
  const [results, setResults] = useState({ posts: [], people: [], jobs: [] });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';

  useEffect(() => {
    const handleLocationChange = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('searchchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('searchchange', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ posts: [], people: [], jobs: [] });
        return;
      }

      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        q: query,
        type,
        limit: '20',
        offset: '0'
      });

      try {
        const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setResults(data.results || { posts: [], people: [], jobs: [] });
        } else {
          setErrorMsg(data.message || 'Search failed');
        }
      } catch {
        setErrorMsg('Server connection failed.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, type]);

  const totals = useMemo(() => ({
    posts: results.posts.length,
    people: results.people.length,
    jobs: results.jobs.length
  }), [results]);

  const allCount = totals.posts + totals.people + totals.jobs;

  const updateType = (nextType) => {
    const params = new URLSearchParams({ q: query, type: nextType });
    window.history.pushState({}, '', `/search?${params.toString()}`);
    window.dispatchEvent(new Event('searchchange'));
  };

  const handleConnectionAction = async (actionType, userId) => {
    if (actionType === 'message') {
      const targetUser = results.people.find(person => person.id === userId);
      if (targetUser) {
        if (onSelectContact) onSelectContact(targetUser);
        if (onTabChange) onTabChange('messaging');
      }
      return;
    }

    const token = localStorage.getItem('token');
    const endpoint = actionType === 'request'
      ? `${API_BASE_URL}/api/connections/request`
      : actionType === 'accept'
        ? `${API_BASE_URL}/api/connections/accept`
        : `${API_BASE_URL}/api/connections/reject`;
    const body = actionType === 'request'
      ? { receiver_id: userId }
      : { requester_id: userId };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      setFeedback({ type: response.ok ? 'success' : 'error', message: data.message || 'Action completed' });
    } catch {
      setFeedback({ type: 'error', message: 'Network request failure' });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  const handleApply = async (jobId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });
      const data = await response.json();
      if (response.ok) {
        setResults(prev => ({
          ...prev,
          jobs: prev.jobs.map(job => job.id === jobId ? { ...job, has_applied: 1, applicant_count: (job.applicant_count || 0) + 1 } : job)
        }));
        setFeedback({ type: 'success', message: 'Application submitted!' });
      } else {
        setFeedback({ type: 'error', message: data.message || 'Application failed' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network request failure' });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = async (jobId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          jobs: prev.jobs.map(job => job.id === jobId ? { ...job, has_saved: job.has_saved ? null : 1 } : job)
        }));
      }
    } catch (error) {
      console.error('Failed to save job from search results:', error);
    }
  };

  const shouldShowPosts = type === 'all' || type === 'posts';
  const shouldShowPeople = type === 'all' || type === 'people';
  const shouldShowJobs = type === 'all' || type === 'jobs';

  return (
    <div className="search-results-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map(category => {
          const count = category.id === 'all' ? allCount : totals[category.id];
          const active = type === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => updateType(category.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: active ? '1px solid var(--primary-blue)' : '1px solid var(--border-color)',
                background: active ? 'var(--primary-light)' : 'white',
                color: active ? 'var(--primary-blue)' : 'var(--text-muted)',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {category.label} {query ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="glass" style={{ padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', fontSize: '0.9rem' }}>
          {feedback.message}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '26px', color: 'var(--primary-blue)' }}></i>
        </div>
      )}

      {errorMsg && (
        <div className="glass" style={{ padding: '18px', borderRadius: 'var(--border-radius-md)', color: 'var(--danger)', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && query && allCount === 0 && (
        <div className="glass" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '42px', marginBottom: '14px', color: '#cbd5e1' }}></i>
          <h3 style={{ color: 'var(--text-color)', marginBottom: '6px' }}>No results found</h3>
          <p style={{ fontSize: '0.9rem' }}>Try a different topic, person, company, or job keyword.</p>
        </div>
      )}

      {!loading && !errorMsg && !query && (
        <div className="glass" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-search" style={{ fontSize: '42px', marginBottom: '14px', color: '#cbd5e1' }}></i>
          <h3 style={{ color: 'var(--text-color)', marginBottom: '6px' }}>Search across DwellSync</h3>
          <p style={{ fontSize: '0.9rem' }}>Use the header search to find posts, people, companies, and jobs.</p>
        </div>
      )}

      {!loading && !errorMsg && shouldShowPosts && results.posts.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '14px' }}>Posts</h2>
          {results.posts.map(post => (
            <PostCard key={`search-post-${post.id}`} {...post} currentUser={currentUser} />
          ))}
        </section>
      )}

      {!loading && !errorMsg && shouldShowPeople && results.people.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '14px' }}>People</h2>
          <div className="connections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {results.people.map(person => (
              <ConnectionCard
                key={`search-person-${person.id}`}
                user={person}
                status={person.connection_status === 'accepted' ? 'accepted' : 'suggestion'}
                onAction={handleConnectionAction}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && !errorMsg && shouldShowJobs && results.jobs.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '14px' }}>Jobs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {results.jobs.map(job => (
              <JobCard
                key={`search-job-${job.id}`}
                job={job}
                onApply={handleApply}
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SearchResults;
