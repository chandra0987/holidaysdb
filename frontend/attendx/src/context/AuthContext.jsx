import { createContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const readResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      return {};
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : {};
  } catch (error) {
    return {};
  }
};

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
  const [duvetLogs, setDuvetLogs] = useState([]);
  const [holidayPayouts, setHolidayPayouts] = useState([]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const handleUnauthorized = (response) => {
    if (response && response.status === 401) {
      logout();
      return true;
    }

    return false;
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await readResponseBody(response);

      if (!response.ok) {
        console.error('Login failed:', response.status, data);
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
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-requests`, {
        headers: authHeaders()
      });
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();
      setLeaveRequests(data.data || []);
    } catch (error) {
      console.error('Fetch leave requests error:', error);
    }
  };

  const fetchStaffLeaveRequests = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/staff/holiday-requests`, {
        headers: authHeaders()
      });
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();
      setLeaveRequests(data.data || []);
    } catch (error) {
      console.error('Fetch staff leave requests error:', error);
    }
  };

  const fetchDuvetLogs = async () => {
    if (!token) return;
    try {
      const endpoint = user?.role === 'admin' ? `${API_URL}/api/admin/duvet-logs` : `${API_URL}/api/staff/duvet-logs`;
      const response = await fetch(endpoint, {
        headers: authHeaders()
      });
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();
      setDuvetLogs(data.data || []);
    } catch (error) {
      console.error('Fetch duvet logs error:', error);
    }
  };

  const fetchProfile = async () => {
    if (!token || !user) return;
    try {
      const endpoint = user.role === 'admin' ? `${API_URL}/api/admin/staff` : `${API_URL}/api/staff/profile`;
      const response = await fetch(endpoint, {
        headers: authHeaders()
      });
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();

      if (user.role === 'staff') {
        const nextUser = data.user || data;
        setUser(nextUser);
        localStorage.setItem('attendx_user', JSON.stringify(nextUser));
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const fetchHolidayPayouts = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-payouts`, {
        headers: authHeaders()
      });
      if (handleUnauthorized(response) || !response.ok) return;
      const data = await response.json();
      setHolidayPayouts(data.data || []);
    } catch (error) {
      console.error('Fetch holiday payouts error:', error);
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
      if (handleUnauthorized(response)) {
        return { success: false, message: 'Session expired. Please sign in again.' };
      }
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
    if (token && user) {
      if (user.role === 'admin') {
        fetchUsers();
        fetchLeaveRequests();
        fetchDuvetLogs();
        fetchHolidayPayouts();
      } else if (user.role === 'staff') {
        fetchProfile();
        fetchStaffLeaveRequests();
        fetchDuvetLogs();
        fetchHolidayPayouts();
      }
    }
  }, [token, user]);

  const updatePayoutStatus = (payoutId, status, payoutAmount, notes) => {
    setHolidayPayouts(holidayPayouts.map(payout => 
      payout._id === payoutId ? { ...payout, status, payoutAmount, notes } : payout
    ));

    // Call backend to persist changes
    fetch(`${API_URL}/api/admin/holiday-payouts/update-status`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ payoutId, status, payoutAmount, notes })
    }).then(response => {
      if (handleUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        console.error('Update payout status error:', response.status);
      }
    }).catch(err => console.error('Update payout status error:', err));
  };

  const requestLeave = async (requestData) => {
    if (requestData.type === 'Duvet Day') {
      try {
        const response = await fetch(`${API_URL}/api/staff/duvet-day`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            date: requestData.date,
            note: requestData.reason
          })
        });
        const data = await response.json().catch(() => ({}));
        if (handleUnauthorized(response)) {
          return { success: false, message: 'Session expired. Please sign in again.' };
        }
        if (response.ok) {
          await fetchProfile();
          await fetchDuvetLogs();
          return { success: true };
        }
        return { success: false, message: data?.message || data?.msg || 'Duvet day failed' };
      } catch (err) {
        console.error('Duvet day error:', err);
        return { success: false, message: 'Network or server error' };
      }
    }

    // Regular leave -> create holiday request
    try {
      const response = await fetch(`${API_URL}/api/staff/holiday-request`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          days: requestData.days || 1,
          targetMonth: requestData.targetMonth || new Date().toISOString().split('T')[0],
          date: requestData.date,
          type: requestData.type,
          reason: requestData.reason
        })
      });

      const data = await response.json().catch(() => ({}));
      if (handleUnauthorized(response)) {
        return { success: false, message: 'Session expired. Please sign in again.' };
      }
      if (response.ok) {
        await fetchProfile();
        await fetchStaffLeaveRequests();
        return { success: true };
      }
      return { success: false, message: data?.message || data?.msg || 'Holiday request failed' };
    } catch (err) {
      console.error('Holiday request error:', err);
      return { success: false, message: 'Network or server error' };
    }
  };

  const updateLeaveStatus = async (requestId, status) => {
    setLeaveRequests(leaveRequests.map(req => 
      req._id === requestId ? { ...req, status } : req
    ));

    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-requests/update-status`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ requestId, status })
      });

      if (handleUnauthorized(response)) {
        return { success: false, message: 'Session expired. Please sign in again.' };
      }

      if (!response.ok) {
        console.error('Update status error:', response.status);
        return { success: false, message: 'Failed to update request' };
      }

      await fetchUsers();
      await fetchLeaveRequests();
      await fetchDuvetLogs();
      if (user?.role === 'staff') {
        await fetchProfile();
        await fetchStaffLeaveRequests();
      }

      return { success: true };
    } catch (err) {
      console.error('Update status error:', err);
      return { success: false, message: 'Network or server error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      users,
      leaveRequests,
      holidayPayouts,
      login,
      logout,
      createStaff,
      requestLeave,
      updateLeaveStatus,
      updatePayoutStatus
      ,
      duvetLogs,
      fetchDuvetLogs,
      fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
