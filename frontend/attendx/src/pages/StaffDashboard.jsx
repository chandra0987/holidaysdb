import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Clock, AlertTriangle, CheckCircle, Send, DollarSign } from 'lucide-react';

const StaffDashboard = () => {
  const { user, leaveRequests, requestLeave, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState('Regular');
  const [leaveReason, setLeaveReason] = useState('');

  // Holiday Payout state
  const [payoutDays, setPayoutDays] = useState('');
  const [payoutMonth, setPayoutMonth] = useState(new Date().toISOString().slice(0, 7));
  const [remainingBalance, setRemainingBalance] = useState(0);


  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/staff/profile`, { headers: authHeaders });
        const data = await response.json();
        setRemainingBalance(data.remainingBalance);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleRequestLeave = (e) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason) return;

    requestLeave({ date: leaveDate, type: leaveType, reason: leaveReason });
    setIsModalOpen(false);
    setLeaveDate('');
    setLeaveType('Regular');
    setLeaveReason('');
    showToast('Leave request submitted successfully!');
  };

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    const days = Number(payoutDays);

    if (!days || !payoutMonth) return;
    if (!Number.isInteger(days) || days < 1) {
      showToast('Enter a valid number of days.', 'error');
      return;
    }
    if (days > remainingBalance) {
      showToast('Payout days cannot exceed remaining holiday balance.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/staff/holiday-request`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ days, targetMonth: payoutMonth }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to submit payout request.');
      }

      showToast('Holiday payout request submitted successfully!');
      setPayoutDays('');
      const profileResponse = await fetch(`${API_URL}/api/staff/profile`, { headers: authHeaders });
      const profileData = await profileResponse.json();
      setRemainingBalance(profileData.remainingBalance);
    } catch (error) {
      showToast(error.message || 'Failed to submit payout request.', 'error');
    }
  };

  const myRequests = leaveRequests.filter(r => r.staffId === user.id);

  return (
    <div className="container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Welcome, {user.name}</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Calendar size={18} /> Request Leave
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon blue"><Clock size={24} /></div>
            <h3>Total Working Days</h3>
          </div>
          <div className="stat-value">{user.totalDays || 0}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon green"><CheckCircle size={24} /></div>
            <h3>Present Days</h3>
          </div>
          <div className="stat-value">{user.presentDays || 0}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon orange"><AlertTriangle size={24} /></div>
            <h3>Leave Days</h3>
          </div>
          <div className="stat-value">{user.leaveDays || 0}</div>
        </div>
        <div className="glass-panel stat-card">
            <div className="stat-header">
                <div className="stat-icon purple"><DollarSign size={24} /></div>
                <h3>Holidays Remaining</h3>
            </div>
            <div className="stat-value">{remainingBalance}</div>
        </div>
      </div>

      <div className="dashboard-grid-col-2" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>My Leave Requests</h3>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(request => (
                  <tr key={request.id}>
                    <td style={{ fontWeight: 500 }}>{request.date}</td>
                    <td>{request.type || 'Regular'}</td>
                    <td>{request.reason}</td>
                    <td>
                      <span className={`badge badge-${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {myRequests.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      You haven't made any leave requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Holiday Payout Request</h3>
          <form onSubmit={handlePayoutRequest}>
            <div className="form-group">
              <label className="form-label">Number of Days</label>
              <input
                type="number"
                className="form-control"
                value={payoutDays}
                onChange={(e) => setPayoutDays(e.target.value)}
                required
                min="1"
                max={remainingBalance}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Month</label>
              <input
                type="month"
                className="form-control"
                value={payoutMonth}
                onChange={(e) => setPayoutMonth(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <DollarSign size={18} /> Submit Payout Request
            </button>
          </form>
        </div>
      </div>

      {/* Leave Request Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>Request Leave</h3>
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleRequestLeave}>
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-control"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select 
                className="form-control"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
              >
                <option value="Regular">Regular Leave</option>
                <option value="Duvet Day">Duvet Day</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note to Admin / Reason</label>
              <textarea
                className="form-control"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder={leaveType === 'Duvet Day' ? "Taking a duvet day..." : "Please describe why you need this leave..."}
                required
              ></textarea>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={18} /> Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      <div className="toast-container">
        <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>
          {toast.message}
        </div>
      </div>
    </div>
  );
};

