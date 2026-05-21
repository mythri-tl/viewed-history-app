
const InsightsPanel = ({ topics = [], trends = {}, insights = [], range = 'week', onRangeChange }) => {
  const trendBars = trends.weeklyTrends || [];
  const maxTopicScore = topics[0]?.score || topics[0]?.views || 1;
  const visibleTrendBars = range === 'month'
    ? trendBars.filter((_, index) => index % 4 === 0 || index === trendBars.length - 1)
    : trendBars.slice(-7);
  const chartValues = visibleTrendBars.length > 0 ? visibleTrendBars : Array.from({ length: 7 }, (_, index) => ({ date: `day-${index}`, minutes: 0, views: 0 }));
  const chartMaxMinutes = Math.max(...chartValues.map(day => day.minutes || 0), 1);
  const hasTrendActivity = chartValues.some(day => Number(day.minutes || 0) > 0);
  const chartWidth = 280;
  const chartHeight = 150;
  const chartPadding = { top: 12, right: 14, bottom: 32, left: 14 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const slotWidth = plotWidth / chartValues.length;
  const barWidth = Math.min(24, Math.max(14, slotWidth * 0.48));
  const formatDayLabel = (dateValue, index) => {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index] || '';
    return range === 'month'
      ? String(parsedDate.getDate())
      : parsedDate.toLocaleDateString(undefined, { weekday: 'narrow' });
  };
  const formatTooltipLabel = (dateValue, index) => {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return `Day ${index + 1}`;
    return parsedDate.toLocaleDateString(undefined, range === 'month'
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'short' });
  };

  return (
    <div className="glass ai-insights" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="insights-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.1rem' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--primary-blue)' }}></i> AI Learning Insights
        </h3>
        <p className="sub-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time professional engagement analytics</p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
          {['week', 'month'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onRangeChange && onRangeChange(option)}
              style={{
                padding: '6px 10px',
                borderRadius: '16px',
                border: range === option ? '1px solid var(--primary-blue)' : '1px solid var(--border-color)',
                background: range === option ? 'var(--primary-light)' : 'white',
                color: range === option ? 'var(--primary-blue)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {option}
            </button>
          ))}
        </div>
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
              const fillPercentage = Math.max(8, Math.round(((topicData.score || topicData.views || 0) / maxTopicScore) * 100));
              const color = index === 0 ? 'var(--primary-blue)' : index === 1 ? '#8b5cf6' : '#10b981';
              const topicName = topicData.name || topicData.topic;

              return (
                <div key={topicName} className="topic-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '500' }}>
                    <span className="topic-label">{topicName}</span>
                    <span className="topic-count" style={{ color: 'var(--text-muted)' }}>{topicData.minutes || 0} min</span>
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
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '12px' }}>{range === 'month' ? 'Monthly' : 'Weekly'} Learning Trends</h4>
        <div
          className="trend-chart"
          style={{ position: 'relative', padding: '10px 0 2px', borderRadius: 'var(--border-radius-md)', background: 'rgba(255, 255, 255, 0.35)', border: '1px solid rgba(226, 232, 240, 0.75)' }}
          role="img"
          aria-label={`${range === 'month' ? 'Monthly' : 'Weekly'} learning trend chart showing viewed minutes by day`}
        >
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="170" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
            {[0.25, 0.5, 0.75, 1].map(grid => {
              const y = chartPadding.top + plotHeight - (plotHeight * grid);
              return (
                <line
                  key={grid}
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border-color)"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              );
            })}
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={chartPadding.top + plotHeight}
              y2={chartPadding.top + plotHeight}
              stroke="var(--border-color)"
              strokeWidth="1.5"
            />
            {chartValues.map((day, idx) => {
              const minutes = Number(day.minutes || 0);
              const scaledHeight = hasTrendActivity ? Math.max(minutes > 0 ? 7 : 0, (minutes / chartMaxMinutes) * (plotHeight - 8)) : 0;
              const x = chartPadding.left + (slotWidth * idx) + ((slotWidth - barWidth) / 2);
              const y = chartPadding.top + plotHeight - scaledHeight;
              const isCurrentPeriodEnd = idx === chartValues.length - 1;
              const label = formatDayLabel(day.date, idx);
              const tooltipLabel = formatTooltipLabel(day.date, idx);

              return (
                <g key={`${day.date}-${idx}`}>
                  <title>{`${tooltipLabel}: ${minutes} minutes`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={scaledHeight}
                    rx="4"
                    fill={minutes > 0 ? (isCurrentPeriodEnd ? 'var(--primary-blue)' : 'rgba(10, 102, 194, 0.38)') : 'rgba(10, 102, 194, 0.08)'}
                    aria-label={`${tooltipLabel}: ${minutes} minutes`}
                    role="img"
                  />
                  <text
                    x={x + (barWidth / 2)}
                    y={chartPadding.top + plotHeight + 20}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
          {!hasTrendActivity && (
            <div style={{ position: 'absolute', inset: '44px 12px auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', pointerEvents: 'none' }}>
              No learning activity this {range === 'month' ? 'month' : 'week'} yet
            </div>
          )}
        </div>
        
        {trends.completionRate !== undefined && (
          <p className="trend-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: '1.45' }}>
            {trends.totalMinutes || 0} minutes viewed &bull; Completion Rate: <strong style={{ color: 'var(--primary-blue)' }}>{trends.completionRate}%</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;
