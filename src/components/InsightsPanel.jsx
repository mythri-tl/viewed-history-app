

const InsightsPanel = ({ topics = [], trends = {}, insights = [] }) => {
  return (
    <div className="glass ai-insights" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="insights-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.1rem' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--primary-blue)' }}></i> AI Learning Insights
        </h3>
        <p className="sub-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time professional engagement analytics</p>
      </div>
      
      {/* 1. Dynamic Natural Language Insights */}
      {insights.length > 0 && (
        <div className="insight-block" style={{ background: 'rgba(10, 102, 194, 0.05)', padding: '12px 16px', borderRadius: 'var(--border-radius-md)', borderLeft: '3px solid var(--primary-blue)' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
            {insights.slice(0, 3).map((insight, idx) => (
              <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                <i className="fa-solid fa-lightbulb" style={{ color: 'var(--warning)', marginRight: '6px' }}></i> {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Most Explored Topics (Horizontal Bar Charts) */}
      <div className="insight-block">
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '12px' }}>Most Explored Topics</h4>
        <div className="topic-bars" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topics.length > 0 ? (
            topics.slice(0, 3).map((topicData, index) => {
              // Calculate relative percentages based on the top topic
              const maxViews = topics[0].views || 1;
              const fillPercentage = Math.round((topicData.views / maxViews) * 100);
              const color = index === 0 ? 'var(--primary-blue)' : index === 1 ? '#8b5cf6' : '#10b981';

              return (
                <div key={topicData.topic} className="topic-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '500' }}>
                    <span className="topic-label">{topicData.topic}</span>
                    <span className="topic-count" style={{ color: 'var(--text-muted)' }}>{topicData.views} views</span>
                  </div>
                  <div className="bar-bg" style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${fillPercentage}%`, 
                        background: color, 
                        height: '100%', 
                        borderRadius: '4px',
                        transition: 'width 1s ease'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No topics analyzed yet.</div>
          )}
        </div>
      </div>

      {/* 3. Dynamic Learning Trends Chart */}
      <div className="insight-block">
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '12px' }}>Weekly Learning Trends</h4>
        <div className="trend-chart" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
          {trends.weeklyTrends && trends.weeklyTrends.length > 0 ? (
            trends.weeklyTrends.map((day, idx) => {
              const maxViews = Math.max(...trends.weeklyTrends.map(d => d.views)) || 1;
              const barHeight = Math.max(10, Math.round((day.views / maxViews) * 100));
              const isToday = idx === trends.weeklyTrends.length - 1;

              return (
                <div 
                  key={day.date} 
                  className={`chart-bar ${isToday ? 'active' : ''}`} 
                  style={{ 
                    height: `${barHeight}%`,
                    width: '20px',
                    background: isToday ? 'var(--primary-blue)' : 'rgba(10, 102, 194, 0.15)',
                    borderRadius: '4px 4px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'height 0.5s ease'
                  }}
                  title={`${day.date}: ${day.views} views`}
                >
                  <span style={{ fontSize: '0.65rem', transform: 'translateY(16px)', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })
          ) : (
            // Dummy visual charts if raw data is empty
            ['M','T','W','T','F'].map((day, idx) => (
              <div 
                key={idx} 
                style={{ 
                  height: `${(idx + 1) * 15}%`,
                  width: '20px',
                  background: 'rgba(10, 102, 194, 0.15)',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                <span style={{ fontSize: '0.65rem', display: 'block', textAlign: 'center', marginTop: '105%', color: 'var(--text-muted)' }}>{day}</span>
              </div>
            ))
          )}
        </div>
        
        {trends.completionRate !== undefined && (
          <p className="trend-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
            Average Completion Rate: <strong style={{ color: 'var(--primary-blue)' }}>{trends.completionRate}%</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;
