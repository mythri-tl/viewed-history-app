import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import JobCard from './JobCard';

const JobsView = ({ socket }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);

  // Job Listing Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/feed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setJobs(data.feed || []);
      }
    } catch (e) {
      console.error("Failed to load jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleJobCreated = (job) => {
      setJobs(prev => prev.some(existingJob => existingJob.id === job.id) ? prev : [job, ...prev]);
    };

    const handleJobApplicationUpdated = ({ jobId }) => {
      setJobs(prev => prev.map(job => (
        job.id === jobId
          ? { ...job, applicant_count: (job.applicant_count || 0) + 1 }
          : job
      )));
    };

    socket.on('job_created', handleJobCreated);
    socket.on('job_application_updated', handleJobApplicationUpdated);
    return () => {
      socket.off('job_created', handleJobCreated);
      socket.off('job_application_updated', handleJobApplicationUpdated);
    };
  }, [socket]);

  const handleApply = async (jobId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Application submitted!' });
        fetchJobs(); // Update feeds
      } else {
        setFeedback({ type: 'error', message: data.message || 'Application failed' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network request failure' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = async (jobId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });
      if (res.ok) {
        fetchJobs(); // Update feeds
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJobSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          company,
          location,
          salary_range: salaryRange,
          description,
          skills_required: skills
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Job posting created successfully!' });
        setIsPostingModalOpen(false);
        // Clear forms
        setTitle('');
        setCompany('');
        setLocation('');
        setSalaryRange('');
        setDescription('');
        setSkills('');
        fetchJobs(); // Refresh listing
      } else {
        setFeedback({ type: 'error', message: data.message || 'Creation failed' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network request failure' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="jobs-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {feedback && (
        <div 
          className="glass feedback-alert" 
          style={{ padding: '12px 20px', borderRadius: 'var(--border-radius-sm)', background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: feedback.type === 'success' ? '1px solid var(--success)' : '1px solid var(--danger)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', fontSize: '0.9rem' }}
        >
          {feedback.message}
        </div>
      )}

      {/* Board Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Professional Openings</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Apply to modern roles matching your criteria.</p>
        </div>
        <button 
          onClick={() => setIsPostingModalOpen(true)}
          style={{ padding: '10px 18px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <i className="fa-solid fa-plus"></i> Post a Job
        </button>
      </div>

      {/* Job Postings Timeline Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--primary-blue)' }}></i>
        </div>
      ) : jobs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {jobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              onApply={handleApply} 
              onSave={handleSave} 
            />
          ))}
        </div>
      ) : (
        <div className="glass" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-briefcase" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
          <h3>No job postings active</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Be the first to post a new opening using the button above!</p>
        </div>
      )}

      {/* Glassmorphic Job Posting Creation Modal Form */}
      {isPostingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '550px', background: 'white', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.7)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-color)' }}>Post a New Professional Opening</h3>
              <button 
                onClick={() => setIsPostingModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Job Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Software Architect" 
                  required
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. DeepMind" 
                    required
                    value={company} 
                    onChange={e => setCompany(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. London, UK (Hybrid)" 
                    required
                    value={location} 
                    onChange={e => setLocation(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Salary Range</label>
                  <input 
                    type="text" 
                    placeholder="e.g. $120k - $150k" 
                    value={salaryRange} 
                    onChange={e => setSalaryRange(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Required Skills (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. React, Node.js, SQLite" 
                    value={skills} 
                    onChange={e => setSkills(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Job Description</label>
                <textarea 
                  placeholder="Outline roles, responsibilities, and skill criteria details..." 
                  required
                  rows={4}
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPostingModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  Publish Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsView;
