import { API_BASE_URL } from '../config';
import { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const endpoint = isLoginView ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/signup`;
    const payload = isLoginView ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // Store the JWT token securely (in memory or localStorage)
        localStorage.setItem('token', data.token);
        setLoading(false);
        onLogin(data.user);
      } else {
        setLoading(false);
        setErrorMsg(data.message || 'Authentication failed');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Failed to connect to the backend server. Is it running?');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <i className="fa-solid fa-arrows-to-eye" style={{ color: 'var(--primary-blue)', fontSize: '40px', marginBottom: '16px' }}></i>
          <h2>{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLoginView ? 'Sign in to view your professional learning journey' : 'Join to track your viewed posts and insights'}</p>
        </div>
        
        {errorMsg && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLoginView && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com" 
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
            />
          </div>
          {isLoginView && (
            <div className="forgot-password">
              <a href="#">Forgot password?</a>
            </div>
          )}
          <button type="submit" className="btn-primary-full" disabled={loading}>
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : (isLoginView ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginView(!isLoginView); setErrorMsg(''); }}>
              {isLoginView ? 'Join now' : 'Sign in'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
