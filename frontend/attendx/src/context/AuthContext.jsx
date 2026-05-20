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
  const [duvetLogs, setDuvetLogs] = useState([]);
  const [holidayPayouts, setHolidayPayouts] = useState([]);

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

  const fetchLeaveRequests = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-requests`, {
        headers: authHeaders()
      });
      if (!response.ok) return;
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
      if (!response.ok) return;
      const data = await response.json();
      setLeaveRequests(data.data || []);
    } catch (error) {
      console.error('Fetch staff leave requests error:', error);
    }
  };

  const fetchDuvetLogs = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/staff/duvet-logs`, {
        headers: authHeaders()
      });
      if (!response.ok) return;
      const data = await response.json();
      setDuvetLogs(data.data || []);
    } catch (error) {
      console.error('Fetch duvet logs error:', error);
    }
  };

  const fetchHolidayPayouts = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/holiday-payouts`, {
        headers: authHeaders()
      });
      if (!response.ok) return;
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
        fetchHolidayPayouts();
      } else if (user.role === 'staff') {
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
    }).catch(err => console.error('Update payout status error:', err));
  };

  const requestLeave = async (requestData) => {
    // If duvet day, call duvet-day endpoint which immediately logs the duvet day
    if (requestData.type === 'Duvet Day') {
      try {
        const response = await fetch(`${API_URL}/api/staff/duvet-day`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date: requestData.date, note: requestData.reason })
        });
        if (response.ok) {
          // refresh lists
          await fetchDuvetLogs();
          await fetchStaffLeaveRequests();
        }
      } catch (err) {
        console.error('Duvet day error:', err);
      }
      return;
    }

    // Regular leave -> create holiday request
    const newRequest = {
      ...requestData,
      _id: leaveRequests.length + 1,
      staffId: user.id,
      staffName: user.name,
      status: 'pending'
    };
    setLeaveRequests([...leaveRequests, newRequest]);

    // Send to backend
    fetch(`${API_URL}/api/staff/holiday-request`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        days: requestData.days || 1,
        targetMonth: requestData.targetMonth || new Date().toISOString().split('T')[0],
        date: requestData.date,
        type: requestData.type,
        reason: requestData.reason
      })
    }).catch(err => console.error('Holiday request error:', err));
  };

  const updateLeaveStatus = (requestId, status) => {
    setLeaveRequests(leaveRequests.map(req => 
      req._id === requestId ? { ...req, status } : req
    ));

    // Call backend to persist ALL status changes
    fetch(`${API_URL}/api/admin/holiday-requests/update-status`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ requestId, status })
    }).catch(err => console.error('Update status error:', err));
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
      fetchDuvetLogs
    }}>
      {children}
    </AuthContext.Provider>
  );
};
