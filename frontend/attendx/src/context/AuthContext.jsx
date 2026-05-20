import { createContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const loggedInUser = localStorage.getItem('attendx_user');
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('attendx_token') || null);
  const [users, setUsers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [holidayRequests, setHolidayRequests] = useState([]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const login = async (email, password) => {
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
        return false;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('attendx_user', JSON.stringify(data.user));
      localStorage.setItem('attendx_token', data.token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('attendx_user');
    localStorage.removeItem('attendx_token');
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        headers: authHeaders()
      });
      if (!response.ok) return;
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchHolidayRequests = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-requests`, {
        headers: authHeaders()
      });
      if (!response.ok) return;
      const data = await response.json();
      setHolidayRequests(data.data || []);
    } catch (error) {
      console.error('Fetch holiday requests error:', error);
    }
  };

  const createStaff = async (staffData) => {
    if (!token) {
      console.error('Create staff failed: no auth token');
      return { success: false, message: 'Not logged in' };
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...staffData,
          role: 'staff',
          holidayEntitlement: 20,
          carryOver: 0
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Create staff failed:', response.status, data);
        return { success: false, message: data?.message || 'Create failed' };
      }

      await fetchUsers();
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Create staff error:', error);
      return { success: false, message: 'Network or server error' };
    }
  };

  useEffect(() => {
    if (user && !token) {
      logout();
    }
  }, [user, token]);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchUsers();
      fetchHolidayRequests();
    }
  }, [token, user]);

  const requestLeave = (requestData) => {
    const newRequest = {
      ...requestData,
      id: leaveRequests.length + 1,
      staffId: user.id,
      staffName: user.name,
      status: 'pending'
    };
    setLeaveRequests([...leaveRequests, newRequest]);
  };

  const updateLeaveStatus = (requestId, status) => {
    setLeaveRequests(leaveRequests.map(req => 
      req.id === requestId ? { ...req, status } : req
    ));

    // If approved, update staff leave days
    if (status === 'approved') {
      const request = leaveRequests.find(r => r.id === requestId);
      if (request) {
        setUsers(users.map(u => 
          u.id === request.staffId ? { ...u, leaveDays: u.leaveDays + 1 } : u
        ));
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      users,
      leaveRequests,
      holidayRequests,
      login,
      logout,
      createStaff,
      requestLeave,
      updateLeaveStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
