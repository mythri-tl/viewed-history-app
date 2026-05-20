const JobCard = ({ job, onApply, onSave }) => {
  const skills = job.skills_required 
    ? job.skills_required.split(',').map(s => s.trim()).filter(Boolean) 
    : [];

  return (
    <div className="job-card glass" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-color)', transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '4px' }}>
            {job.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: '600', color: 'var(--primary-blue)' }}>{job.company}</span>
            <span>&bull;</span>
            <span><i className="fa-solid fa-location-dot"></i> {job.location}</span>
            {job.salary_range && (
              <>
                <span>&bull;</span>
                <span><i className="fa-solid fa-money-bill-wave"></i> {job.salary_range}</span>
              </>
            )}
          </div>
        </div>

        <button 
          onClick={() => onSave(job.id)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.25rem', color: job.has_saved ? 'var(--primary-blue)' : 'var(--text-muted)', transition: 'color 0.2s' }}
          title={job.has_saved ? "Unsave Job" : "Save Job"}
        >
          <i className={job.has_saved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"}></i>
        </button>
      </div>

      <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#475569', whiteSpace: 'pre-line' }}>
        {job.description}
      </p>

      {skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {skills.map((skill, index) => (
            <span 
              key={index} 
              style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(10, 102, 194, 0.05)', color: 'var(--primary-blue)', fontSize: '0.75rem', fontWeight: '600' }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {job.applicant_count || 0} applicants
        </span>

        {job.has_applied ? (
          <button 
            disabled 
            style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: '#e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-circle-check"></i> Applied
          </button>
        ) : (
          <button 
            onClick={() => onApply(job.id)}
            style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};

export default JobCard;
