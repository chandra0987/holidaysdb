import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        // Non-admin tried to login here
        setError('Only admins can sign in here');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials');
      return;
    }

    // Immediately check the stored user role (login may update context asynchronously)
    try {
      const stored = localStorage.getItem('attendx_user');
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed && parsed.role === 'admin') {
        navigate('/admin');
      } else {
        // If a non-admin accidentally logged in via admin form, log them out and show error
        logout();
        setError('Only admins can sign in here');
      }
    } catch (err) {
      console.error('Post-login role check failed', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="glass-panel">
          <div className="auth-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '1rem' }}>Admin Access</div>
            <p>Only admin credentials can be used here. Staff should use the staff login page.</p>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.08)', 
              color: 'var(--text-main)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address or Name</label>
              <input
                type="text"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email or full name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Sign In with Admin Credentials
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Need staff access? </span>
              <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                Go to staff login page
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
