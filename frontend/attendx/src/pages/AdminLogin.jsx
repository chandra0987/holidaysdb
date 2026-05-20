import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('attendx_user');
    const storedToken = localStorage.getItem('attendx_token');
    if (loggedInUser && storedToken) {
      const parsedUser = JSON.parse(loggedInUser);
      if (parsedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || 'Invalid credentials');
        return;
      }

      if (data.user.role !== 'admin') {
        setError('Only admin accounts can sign in here');
        return;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('attendx_user', JSON.stringify(data.user));
      localStorage.setItem('attendx_token', data.token);
      navigate('/admin');
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="glass-panel">
          <div className="auth-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
              <ShieldCheck size={32} color="var(--primary)" />
              <span>Admin Access</span>
            </div>
            <p>Sign in to admin dashboard</p>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.2)', 
              color: 'var(--danger)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
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
              <LogIn size={20} /> Sign In as Admin
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Not an admin? </span>
              <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                Staff login
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
