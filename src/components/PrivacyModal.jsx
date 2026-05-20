import { useState } from 'react';

const PrivacyModal = ({ isOpen, onClose, onClearHistory, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState({
    is_paused: false,
    private_mode: false,
    auto_delete_days: 30,
    min_duration_seconds: 3,
    min_visibility_pct: 50,
    filter_read_posts: false
  });

  const [prevSettings, setPrevSettings] = useState(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  if (settings !== prevSettings || isOpen !== prevIsOpen) {
    setPrevSettings(settings);
    setPrevIsOpen(isOpen);
    if (settings) {
      setLocalSettings({
        is_paused: !!settings.is_paused,
        private_mode: !!settings.private_mode,
        auto_delete_days: settings.auto_delete_days || 30,
        min_duration_seconds: settings.min_duration_seconds !== undefined ? settings.min_duration_seconds : 3,
        min_visibility_pct: settings.min_visibility_pct !== undefined ? settings.min_visibility_pct : 50,
        filter_read_posts: !!settings.filter_read_posts
      });
    }
  }

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleToggle = (key) => {
    const updatedValue = !localSettings[key];
    const updated = { ...localSettings, [key]: updatedValue };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleDropdownChange = (key, value) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your entire view history?')) {
      onClearHistory();
      onClose();
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={handleOverlayClick} style={{ opacity: isOpen ? 1 : 0, visibility: isOpen ? 'visible' : 'hidden' }}>
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>History & Privacy Controls</h2>
          <button className="close-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="modal-body">
          {/* PAUSE HISTORY */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-solid fa-pause"></i> Pause History</h4>
              <p>Temporarily stop saving your viewed posts.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={localSettings.is_paused}
                onChange={() => handleToggle('is_paused')}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* PRIVATE BROWSING */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-solid fa-user-secret"></i> Private Browsing</h4>
              <p>Authors won't see that you viewed their profile/post.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={localSettings.private_mode}
                onChange={() => handleToggle('private_mode')}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* FILTER VIEWED POSTS FROM FEED */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-solid fa-eye-slash"></i> Filter Read Posts from Feed</h4>
              <p>Hide posts from your Home feed that you've fully read.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={localSettings.filter_read_posts}
                onChange={() => handleToggle('filter_read_posts')}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* AUTO DELETE HISTORY */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-solid fa-clock"></i> Auto-delete History</h4>
              <p>Automatically clear history older than specified days.</p>
            </div>
            <select 
              className="glass-select" 
              value={localSettings.auto_delete_days === 0 ? 'Never' : `${localSettings.auto_delete_days} Days`}
              onChange={(e) => {
                const days = e.target.value === 'Never' ? 0 : parseInt(e.target.value);
                handleDropdownChange('auto_delete_days', days);
              }}
            >
              <option value="Never">Never</option>
              <option value="30 Days">30 Days</option>
              <option value="90 Days">90 Days</option>
            </select>
          </div>

          {/* CRITERIA: MIN READING DWELL DURATION */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-regular fa-hourglass-half"></i> Reading Duration Threshold</h4>
              <p>Minimum dwelling time (seconds) to count a post as viewed.</p>
            </div>
            <select 
              className="glass-select" 
              value={`${localSettings.min_duration_seconds}s`}
              onChange={(e) => {
                const secs = parseInt(e.target.value);
                handleDropdownChange('min_duration_seconds', secs);
              }}
            >
              <option value="1s">1 Second</option>
              <option value="2s">2 Seconds</option>
              <option value="3s">3 Seconds (Default)</option>
              <option value="5s">5 Seconds</option>
              <option value="10s">10 Seconds</option>
            </select>
          </div>

          {/* CRITERIA: INTERSECTION SCROLL VISIBILITY % */}
          <div className="setting-row">
            <div className="setting-info">
              <h4><i className="fa-solid fa-arrows-to-eye"></i> Scroll Visibility Criteria</h4>
              <p>Percentage of post card height visible in viewport to track dwell time.</p>
            </div>
            <select 
              className="glass-select" 
              value={`${localSettings.min_visibility_pct}%`}
              onChange={(e) => {
                const pct = parseInt(e.target.value);
                handleDropdownChange('min_visibility_pct', pct);
              }}
            >
              <option value="25%">25% Visibility</option>
              <option value="50%">50% Visibility (Default)</option>
              <option value="75%">75% Visibility</option>
              <option value="100%">100% Fully On Screen</option>
            </select>
          </div>
          
          <div className="danger-zone">
            <button className="btn-danger" onClick={handleClear} style={{ width: '100%', padding: '12px', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', transition: 'all 0.3s' }}>
              <i className="fa-solid fa-trash-can"></i> Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
