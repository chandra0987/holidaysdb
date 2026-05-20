import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import HolidayRequest from './pages/HolidayRequest';
import { LogOut, User } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
  const { user, token } = useAuth();
  
  if (!user || !token) return <Navigate to="/" />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} />;
  }
  
  return children;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="logo">
        <User size={28} color="var(--primary)" />
        AttendX
      </div>
      <div className="user-profile">
        <div className="avatar">{user.name.charAt(0)}</div>
        <div className="user-info" style={{ marginRight: '1rem' }}>
          <div style={{ fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.role}</div>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRegister />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/staff/*" 
          element={
            <ProtectedRoute role="staff">
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/staff/holiday-request" 
          element={
            <ProtectedRoute role="staff">
              <HolidayRequest />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
