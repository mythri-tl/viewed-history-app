import { useState } from 'react';

const ProductivityWidgets = ({ historyPosts = [], onResumeReading, onTabChange }) => {
  const [loading, setLoading] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem('dailyGoalTarget');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // Find the most recent incomplete post (duration_seconds < 6 and completed = 0)
  const incompletePost = historyPosts.find(p => !p.completed && p.duration_seconds < 6);
  
  const handleAction = () => {
    if (!incompletePost) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onResumeReading(incompletePost.id);
    }, 500);
  };

  // Calculate stats
  const totalLogged = historyPosts.length;
  const progressWidth = incompletePost 
    ? Math.round((incompletePost.duration_seconds / 6) * 100) 
    : 100;

  // Calculate actual reads logged today (correct real-time daily metrics)
  const postsReadToday = historyPosts.filter(p => {
    if (!p.viewed_at) return false;
    return new Date(p.viewed_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    <section className="productivity-widgets">
      {/* 1. Resume Reading Widget */}
      <div className="widget glass resume-reading">
        <div className="widget-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-blue)' }}><i className="fa-solid fa-book-open-reader"></i></div>
        <div className="widget-content" style={{ flexGrow: 1 }}>
          <h3>Resume Reading</h3>
          <p style={{ maxWidth: '140px' }}>
            {incompletePost 
              ? (incompletePost.content.length > 20 ? incompletePost.content.substring(0, 20) + '...' : incompletePost.content) 
              : 'All caught up!'}
          </p>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progressWidth}%`, transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
        {incompletePost && (
          <button className="btn-primary-sm" onClick={handleAction} disabled={loading}>
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Continue'}
          </button>
        )}
      </div>
      
      {/* 2. Dynamic History Count Widget (Clickable navigation) */}
      <div 
        className="widget glass" 
        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
        onClick={() => onTabChange && onTabChange('history')}
        title="Click to view full history list"
      >
        <div className="widget-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}><i className="fa-solid fa-bookmark"></i></div>
        <div className="widget-content" style={{ flexGrow: 1 }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Saved History</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalLogged} articles read</p>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6 }}>
          <i className="fa-solid fa-arrow-right"></i>
        </div>
      </div>

      {/* 3. Daily Goal Status (Interactive target settings toggle) */}
      <div 
        className="widget glass" 
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          flexDirection: isEditingGoal ? 'column' : 'row', 
          alignItems: isEditingGoal ? 'flex-start' : 'center',
          gap: isEditingGoal ? '10px' : '16px',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
        onClick={(e) => {
          if (!e.target.closest('.target-btn')) {
            setIsEditingGoal(!isEditingGoal);
          }
        }}
        title="Click to adjust your daily target goal"
      >
        {isEditingGoal ? (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>Set Daily Target:</h3>
              <i className="fa-solid fa-xmark" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}></i>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {[1, 3, 5, 10].map(val => (
                <button
                  key={val}
                  className="target-btn"
                  onClick={() => {
                    setDailyGoal(val);
                    localStorage.setItem('dailyGoalTarget', val.toString());
                    setIsEditingGoal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid',
                    borderColor: dailyGoal === val ? 'var(--primary-blue)' : 'var(--border-color)',
                    background: dailyGoal === val ? 'var(--primary-light)' : 'white',
                    color: dailyGoal === val ? 'var(--primary-blue)' : 'var(--text-main)',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="widget-icon" style={{ background: '#fff3e0', color: '#ef6c00' }}>
              <i className={postsReadToday >= dailyGoal ? "fa-solid fa-trophy" : "fa-solid fa-bullseye"}></i>
            </div>
            <div className="widget-content" style={{ flexGrow: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Daily Learning Goal</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {postsReadToday >= dailyGoal ? 'Goal Achieved! 🏆' : `${postsReadToday}/${dailyGoal} posts read today`}
              </p>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6 }}>
              <i className="fa-solid fa-pen" title="Adjust Target"></i>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProductivityWidgets;
