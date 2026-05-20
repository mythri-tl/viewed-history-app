import { useState } from 'react';

const Header = ({ activeTab, onOpenPrivacyModal }) => {
  const [filterActive, setFilterActive] = useState(false);

  return (
    <header className="header glass">
      <div className="header-title">
        <h1>{
          activeTab === 'home' ? 'Professional Learning Feed' :
          activeTab === 'history' ? 'Viewed Posts History' :
          activeTab === 'connections' ? 'Professional Network' :
          activeTab === 'jobs' ? 'Careers Hub' :
          activeTab === 'messaging' ? 'Professional Chats' :
          activeTab === 'notifications' ? 'Alerts Center' :
          'DwellSync Network'
        }</h1>
        <p>{
          activeTab === 'home' ? 'Discover insights, share expertise, and expand your network' :
          activeTab === 'history' ? 'Revisit your professional learning journey' :
          activeTab === 'connections' ? 'Connect and grow with verified industry experts' :
          activeTab === 'jobs' ? 'Discover high-impact roles matching your expertise' :
          activeTab === 'messaging' ? 'Secure 1-on-1 real-time communications with active connections' :
          activeTab === 'notifications' ? 'Stay updated with incoming invites, applications, and messages' :
          'Your intelligent professional networking dashboard'
        }</p>
      </div>
      
      <div className="search-experience">
        <div className="search-bar glass">
          <i className="fa-solid fa-search"></i>
          <input type="text" placeholder="Search by topic, author, or company..." />
          <button 
            className={`filter-btn ${filterActive ? 'active' : ''}`}
            onClick={() => setFilterActive(!filterActive)}
            style={filterActive ? { background: 'var(--primary-light)', color: 'var(--primary-blue)', borderColor: 'var(--primary-light)' } : {}}
          >
            <i className="fa-solid fa-sliders"></i> Filters
          </button>
        </div>
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Privacy Controls" onClick={onOpenPrivacyModal}>
          <i className="fa-solid fa-shield-halved"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;
