import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Clock, AlertTriangle, CheckCircle, Send } from 'lucide-react';

const StaffDashboard = () => {
  const { user, leaveRequests, requestLeave, duvetLogs } = useAuth();
  const navigate = useNavigate();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState('Regular');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDays, setLeaveDays] = useState('1');

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason || !leaveDays) return;
    // enforce duvet day limit
    if (leaveType === 'Duvet Day' && duvetDaysCount >= 8) {
      showToast('Maximum duvet days reached', 'error');
      return;
    }

    const result = await requestLeave({ 
      date: leaveDate, 
      type: leaveType, 
      reason: leaveReason,
      days: parseInt(leaveDays, 10),
      targetMonth: new Date().toISOString().split('T')[0]
    });

    if (result && result.success) {
      setIsModalOpen(false);
      setLeaveDate('');
      setLeaveType('Regular');
      setLeaveReason('');
      setLeaveDays('1');
      showToast('Leave request submitted successfully!');
    } else {
      showToast(result?.message || 'Failed to submit request', 'error');
    }
  };

  const myRequests = leaveRequests.filter(r => r.userId === user._id || r.staffName === user.name);

  // compute approved leave days (sum of days for approved requests)
  const approvedLeaveDays = myRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (parseInt(r.days, 10) || 0), 0);

  // duvet days logged by this user
  const myDuvetLogs = (duvetLogs || []).filter(d => String(d.userId) === String(user._id) || (d.userId && d.userId._id && String(d.userId._id) === String(user._id)));
  const duvetDaysCount = myDuvetLogs.length;
  const duvetDaysRemaining = Math.max(0, 8 - duvetDaysCount);

  return (
    <div className="container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Welcome, {user.name}</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Calendar size={18} /> Request Leave
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/staff/holiday-request')}>
            <Calendar size={18} /> Holiday Payment
          </button>
        </div>
      </div>

      <div className="dashboard-grid full-width">
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
            <h3>Leave Days (approved)</h3>
          </div>
          <div className="stat-value">{approvedLeaveDays}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon"><AlertTriangle size={24} /></div>
            <h3>Duvet Days Logged</h3>
          </div>
          <div className="stat-value">{duvetDaysCount}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon"><AlertTriangle size={24} /></div>
            <h3>Duvet Remaining</h3>
          </div>
          <div className="stat-value">{duvetDaysRemaining}</div>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem' }}>My Leave Requests</h3>
        
        <div className="request-card-list">
          {myRequests.length > 0 ? myRequests.map(request => (
            <div className="request-card" key={request._id}>
              <div className="request-card-header">
                <div>
                  <strong>Date</strong>
                  <p>{request.date}</p>
                </div>
                <span className={`badge badge-${request.status}`}>
                  {request.status}
                </span>
              </div>
              <div className="request-card-body">
                <div className="request-card-field">
                  <span>Type</span>
                  <p>{request.type || 'Regular'}</p>
                </div>
                <div className="request-card-field">
                  <span>Reason</span>
                  <p>{request.reason}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="request-card empty-card">
              You haven't made any leave requests yet.
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>My Duvet Days</h3>
        <div className="request-card-list">
          {duvetLogs && duvetLogs.length > 0 ? duvetLogs.map(log => (
            <div className="request-card" key={log._id}>
              <div className="request-card-header">
                <div>
                  <strong>Date</strong>
                  <p>{log.date}</p>
                </div>
                <span className={`badge badge-pending`}>
                  Logged
                </span>
              </div>
              <div className="request-card-body">
                <div className="request-card-field">
                  <span>Note</span>
                  <p>{log.note || '-'}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="request-card empty-card">
              No duvet days logged.
            </div>
          )}
        </div>
      </div>

      {/* Leave Request Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>Request Leave</h3>
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleRequestLeave} className="stacked-form">
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
                  onChange={(e) => {
                    const v = e.target.value;
                    setLeaveType(v);
                    if (v === 'Duvet Day') setLeaveDays('1');
                  }}
                  required
                >
                  <option value="Regular">Regular Leave</option>
                  <option value="Duvet Day" disabled={duvetDaysRemaining === 0}>
                    {duvetDaysRemaining === 0 ? 'Duvet Day (limit reached)' : 'Duvet Day'}
                  </option>
                </select>
            </div>
            <div className="form-group">
              <label className="form-label">Number of Days</label>
              <input
                type="number"
                className="form-control"
                value={leaveDays}
                  onChange={(e) => setLeaveDays(e.target.value)}
                  disabled={leaveType === 'Duvet Day'}
                min="1"
                max="30"
                required
              />
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

export default StaffDashboard;
