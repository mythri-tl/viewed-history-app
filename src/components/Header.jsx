import { useState } from 'react';

const Header = ({ activeTab, onOpenPrivacyModal, onSearch, searchQuery, onSearchChange }) => {
  const [filterActive, setFilterActive] = useState(false);
  const [query, setQuery] = useState('');
  const inputValue = searchQuery ?? query;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (onSearchChange) onSearchChange(value);
    setQuery(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = inputValue.trim();
    if (!trimmedQuery) return;
    if (onSearch) onSearch(trimmedQuery);
  };

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
          activeTab === 'search' ? 'Search Results' :
          activeTab === 'post' ? 'Post Details' :
          'DwellSync Network'
        }</h1>
        <p>{
          activeTab === 'home' ? 'Discover insights, share expertise, and expand your network' :
          activeTab === 'history' ? 'Revisit your professional learning journey' :
          activeTab === 'connections' ? 'Connect and grow with verified industry experts' :
          activeTab === 'jobs' ? 'Discover high-impact roles matching your expertise' :
          activeTab === 'messaging' ? 'Secure 1-on-1 real-time communications with active connections' :
          activeTab === 'notifications' ? 'Stay updated with incoming invites, applications, and messages' :
          activeTab === 'search' ? 'Find posts, people, companies, and jobs across your network' :
          activeTab === 'post' ? 'Viewing a single post' :
          'Your intelligent professional networking dashboard'
        }</p>
      </div>

      <div className="search-experience">
        <form className="search-bar glass" onSubmit={handleSearchSubmit}>
          <button
            type="submit"
            aria-label="Search"
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <i className="fa-solid fa-search"></i>
          </button>
          <input
            type="text"
            placeholder="Search by topic, author, company, jobs..."
            value={inputValue}
            onChange={handleSearchChange}
          />
          <button
            type="button"
            className={`filter-btn ${filterActive ? 'active' : ''}`}
            onClick={() => setFilterActive(!filterActive)}
            style={filterActive ? { background: 'var(--primary-light)', color: 'var(--primary-blue)', borderColor: 'var(--primary-light)' } : {}}
          >
            <i className="fa-solid fa-sliders"></i> Filters
          </button>
        </form>
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
