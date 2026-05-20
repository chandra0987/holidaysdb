import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/staff');
    }
  }, [user, navigate]);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/register-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to create admin account');
      }

      setSuccess('Admin account created successfully. Redirecting to sign in...');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        navigate('/');
      }, 1400);
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="auth-page"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(255,255,255,0.95), rgba(237,242,247,1) 45%, rgba(226,232,240,1) 100%)'
      }}
    >
      <div className="auth-container" style={{ maxWidth: '960px' }}>
        <div
          className="glass-panel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'stretch'
          }}
        >
          <div style={{ padding: '0.25rem 0' }}>
            <div className="logo" style={{ marginBottom: '1.5rem' }}>
              <ShieldCheck size={28} color="var(--primary)" />
              AttendX Admin
            </div>
            <h1 style={{ marginBottom: '1rem' }}>Create the first admin account</h1>
            <p style={{ marginBottom: '1.5rem' }}>
              Register an admin profile to manage staff records, leave requests, and exports from the dashboard.
            </p>

            <div style={{ display: 'grid', gap: '0.9rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <UserPlus size={18} style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <span style={{ color: 'var(--text-muted)' }}>Simple setup for internal admin onboarding.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <span style={{ color: 'var(--text-muted)' }}>Creates the account with the admin role automatically.</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </div>
          </div>

          <div>
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--danger)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: 'var(--primary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem'
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Enter admin name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="Enter admin email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange('password')}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="Re-enter the password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" /> Creating account...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Create Admin Account
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;