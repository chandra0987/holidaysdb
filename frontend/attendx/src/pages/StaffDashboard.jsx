import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const StaffDashboard = () => {
  const { user, leaveRequests, requestLeave, duvetLogs, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const currentUser = user || {};

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState('Regular');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDays, setLeaveDays] = useState('1');
  const [submitNotice, setSubmitNotice] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    if (!user) return;

    fetchProfile();

    const intervalId = setInterval(() => {
      fetchProfile();
    }, 30000);

    const handleFocus = () => {
      fetchProfile();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?._id, user?.role, fetchProfile]);

  if (!user) {
    return (
      <div className="container fade-in" style={{ paddingTop: '2rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
          Loading staff profile...
        </div>
      </div>
    );
  }

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
      setLeaveDate('');
      setLeaveType('Regular');
      setLeaveReason('');
      setLeaveDays('1');
      setSubmitNotice('Your submission is completed. Admin will review it.');
    } else {
      setSubmitNotice('');
      showToast(result?.message || 'Failed to submit request', 'error');
    }
  };

  const myRequests = leaveRequests.filter(r =>
    String(r.userId) === String(currentUser._id) ||
    r.staffName === currentUser.name ||
    r.staffName === currentUser.email ||
    String(r.staffName || '').toLowerCase() === String(currentUser.name || '').toLowerCase()
  );

  // compute approved leave days (sum of days for approved requests)
  const approvedLeaveDays = myRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (parseInt(r.days, 10) || 0), 0);

  // duvet days logged by this user
  const myDuvetLogs = (duvetLogs || []).filter(d => String(d.userId) === String(currentUser._id) || (d.userId && d.userId._id && String(d.userId._id) === String(currentUser._id)));
  const duvetDaysCount = myDuvetLogs.length;
  const duvetDaysRemaining = Math.max(0, 8 - duvetDaysCount);

  // Holiday entitlement metrics
  const holidayEntitlement = toNumber(currentUser.holidayEntitlement, 28);
  const carryOver = toNumber(currentUser.carryOver, 0);
  const daysTaken = toNumber(currentUser.daysTaken, 0);
  const remainingBalance = holidayEntitlement + carryOver - daysTaken;

  return (
    <div className="container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Welcome, {currentUser.name || 'Staff Member'}</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            Request Leave
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/staff/holiday-request')}>
            Holiday Payment
          </button>
        </div>
      </div>

      <div className="dashboard-grid full-width">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Holiday Entitlement</h3>
          </div>
          <div className="stat-value">{holidayEntitlement}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Base annual allowance</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Carry Over Days</h3>
          </div>
          <div className="stat-value">{carryOver}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>From prior year</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Days Taken So Far</h3>
          </div>
          <div className="stat-value">{daysTaken}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Current period</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Remaining Balance</h3>
          </div>
          <div className="stat-value" style={{ color: '#000000' }}>{remainingBalance}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Dynamically calculated</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Working Status</h3>
          </div>
          <div className="stat-value">{currentUser.isWorking ? 'Working' : 'Not Working'}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Synced from imported profile</div>
        </div>
      </div>

      <div className="dashboard-grid full-width">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Total Working Days</h3>
          </div>
          <div className="stat-value">{currentUser.totalDays || 0}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Present Days</h3>
          </div>
          <div className="stat-value">{currentUser.presentDays || 0}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Leave Days (approved)</h3>
          </div>
          <div className="stat-value">{approvedLeaveDays}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Duvet Days Logged</h3>
          </div>
          <div className="stat-value">{duvetDaysCount}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
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
      <div className={`modal-overlay leave-request-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal leave-request-modal">
          <div className="modal-header">
            <h3>Request Leave</h3>
            <button className="close-btn" onClick={() => {
              setIsModalOpen(false);
              setSubmitNotice('');
            }}>&times;</button>
          </div>

          {submitNotice && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.06)',
              color: 'var(--text-main)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              border: '1px solid var(--border)'
            }}>
              {submitNotice}
            </div>
          )}
          
          <form onSubmit={handleRequestLeave} className="stacked-form">
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-control"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
                min={leaveType === 'Duvet Day' ? today : undefined}
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
                Submit Request
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
