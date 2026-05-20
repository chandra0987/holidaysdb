import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Users, UserPlus, CheckCircle, XCircle, Calendar, Download, Search } from 'lucide-react';

const AdminDashboard = () => {
  const { users, leaveRequests, holidayPayouts, createStaff, updateLeaveStatus, updatePayoutStatus, token } = useAuth();
  const [activeTab, setActiveTab] = useState('staff'); // staff, requests, payouts, new-staff
  const [payoutModal, setPayoutModal] = useState({ show: false, payoutId: '', status: '', amount: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // New staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const result = await createStaff({ name, email, password });
    if (result.success) {
      setName('');
      setEmail('');
      setPassword('');
      setActiveTab('staff');
    } else {
      alert(`Unable to create staff: ${result.message}`);
    }
  };

  const staffMembers = users.filter(u => u.role === 'staff');
  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.serviceYears?.toString().includes(searchQuery)
  );

<<<<<<< HEAD
  const getRemainingBalance = (staff) =>
    staff.remainingBalance ??
    ((staff.holidayEntitlement ?? 0) + (staff.carryOver ?? 0) - (staff.daysTaken ?? 0));

  const getOverdue = (staff) => {
    const balance = getRemainingBalance(staff);
    return balance < 0 ? Math.abs(balance) : 0;
  };

  const csvValue = (value) => {
    const text = `${value ?? ''}`;
    return `"${text.replace(/"/g, '""')}"`;
=======
  const filteredRequests = leaveRequests.filter(request =>
    request.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayouts = holidayPayouts?.filter(payout =>
    payout.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payout.targetMonth.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
>>>>>>> e73b60c5a935568154adfc948087a06968f50fb5
  };

  const handleClearSearch = () => setSearchQuery('');

  const exportToCSV = async () => {
    if (activeTab === 'staff') {
      setIsExporting(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/export-csv`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) {
          throw new Error('Unable to export CSV');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        alert(error.message || 'Failed to export CSV');
      } finally {
        setIsExporting(false);
      }
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === 'requests') {
      csvContent += "Staff Name,Date,Type,Reason,Status\n";
      leaveRequests.forEach(req => {
        const reason = req.reason.replace(/,/g, " "); // prevent comma collision
        csvContent += `${req.staffName},${req.date},${req.type || 'Regular'},${reason},${req.status}\n`;
      });
    } else if (activeTab === 'payouts') {
      csvContent += "Staff Name,From Date,To Date,Days,Target Month,Amount,Status\n";
      filteredPayouts.forEach(payout => {
        csvContent += `${payout.staffName},${payout.fromDate},${payout.toDate},${payout.numberOfDays},${payout.targetMonth},\u00a3${payout.payoutAmount || 0},${payout.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Admin Dashboard</h2>
        {(activeTab === 'staff' || activeTab === 'requests' || activeTab === 'payouts') && (
          <button className="btn btn-secondary" onClick={exportToCSV} disabled={isExporting}>
            <Download size={18} /> {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>
      
      <div className="dashboard-grid">
        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <div className="stat-icon blue"><Users size={24} /></div>
            <h3>Total Staff</h3>
          </div>
          <div className="stat-value">{staffMembers.length}</div>
        </div>
        
        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <div className="stat-icon orange"><Calendar size={24} /></div>
            <h3>Pending Leaves</h3>
          </div>
          <div className="stat-value">
            {leaveRequests.filter(r => r.status === 'pending').length}
          </div>
        </div>

        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <div className="stat-icon purple"><Calendar size={24} /></div>
            <h3>Pending Payouts</h3>
          </div>
          <div className="stat-value">
            {holidayPayouts?.filter(p => p.status === 'pending').length || 0}
          </div>
        </div>

        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <div className="stat-icon green"><Users size={24} /></div>
            <h3>Departments</h3>
          </div>
          <div className="stat-value">
            {Array.from(new Set(staffMembers.map(staff => staff.department || 'Unknown'))).length}
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div className="auth-tabs">
          <div 
            className={`auth-tab ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff Directory
          </div>
          <div 
            className={`auth-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Leave Requests
          </div>
          <div 
            className={`auth-tab ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            Holiday Payouts
          </div>
          <div 
            className={`auth-tab ${activeTab === 'new-staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-staff')}
          >
            <UserPlus size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
            Add Staff
          </div>
        </div>

        {(activeTab === 'staff' || activeTab === 'requests' || activeTab === 'payouts') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 320px' }}>
              <input
                type="text"
                className="form-control"
                placeholder={activeTab === 'staff' ? 'Search staff by name, department or years' : activeTab === 'payouts' ? 'Search payouts by staff name or month' : 'Search requests by name, type or reason'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={16} /> Search
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClearSearch}>
                Clear
              </button>
            </form>
            <div style={{ minWidth: '180px', textAlign: 'right' }}>
              {searchQuery && <span style={{ color: 'var(--text-muted)' }}>Filtering for "{searchQuery}"</span>}
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
<<<<<<< HEAD
          <div className="staff-card-grid">
            {staffMembers.length > 0 ? staffMembers.map(staff => {
              const remainingBalance = getRemainingBalance(staff);
              const overdue = getOverdue(staff);
              return (
                <div className="staff-card" key={staff.id || staff._id}>
                  <div className="staff-card-top">
                    <div>
                      <div className="staff-card-label">Name</div>
                      <div className="staff-card-value">{staff.name || 'Unknown'}</div>
                    </div>
                    <div className="staff-card-badge">
                      <span className="badge badge-approved">{staff.department || 'No Dept'}</span>
                    </div>
                  </div>
                  <div className="staff-card-row">
                    <div>
                      <div className="staff-card-label">Remaining Balance</div>
                      <div className="staff-card-value">{remainingBalance}</div>
                    </div>
                    <div>
                      <div className="staff-card-label">Overdue</div>
                      <div className={`staff-card-value ${overdue > 0 ? 'overdue' : 'normal'}`}>
                        {overdue > 0 ? overdue : '0'}
                      </div>
                    </div>
                  </div>
                  <div className="staff-card-meta">
                    <div>{`Entitlement: ${staff.holidayEntitlement ?? 0}`}</div>
                    <div>{`Taken: ${staff.daysTaken ?? 0}`}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-card">
                No staff members available.
              </div>
            )}
=======
          <div className="table-container">
            <div className="staff-cards">
  {filteredStaff.map((staff) => (
    <div className="staff-card" key={staff.id}>
      <div className="card-header">
        <h3>{staff.name}</h3>
        <span>{staff.department || "-"}</span>
      </div>

      <div className="card-body">
        <div className="card-item">
          <p>Service Years</p>
          <h4>{staff.serviceYears ?? "-"}</h4>
        </div>

        <div className="card-item">
          <p>Holiday Entitlement</p>
          <h4>{staff.holidayEntitlement ?? "-"}</h4>
        </div>

        <div className="card-item">
          <p>Carry Over</p>
          <h4>{staff.carryOver ?? "-"}</h4>
        </div>

        <div className="card-item">
          <p>Days Taken</p>
          <h4>{staff.daysTaken ?? 0}</h4>
        </div>

        <div className="card-item">
          <p>Remaining Balance</p>
          <h4>{staff.remainingBalance ?? "-"}</h4>
        </div>

        <div className="card-item">
          <p>Duvet Remaining</p>
          <h4>{staff.duvetRemaining ?? "-"}</h4>
        </div>
      </div>
    </div>
  ))}

  {filteredStaff.length === 0 && (
    <div className="no-data">
      No staff members match your search.
    </div>
  )}
</div>
>>>>>>> e73b60c5a935568154adfc948087a06968f50fb5
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(request => (
                    <tr key={request._id}>
                    <td style={{ fontWeight: 500 }}>{request.staffName}</td>
                    <td>{request.date}</td>
                    <td>{request.type || 'Regular'}</td>
                    <td>{request.reason}</td>
                    <td>
                      <span className={`badge badge-${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => updateLeaveStatus(request._id, 'approved')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => updateLeaveStatus(request._id, 'rejected')}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No leave requests match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'payouts' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Days</th>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Reason/Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map(payout => (
                  <tr key={payout._id}>
                    <td data-label="Staff Name" style={{ fontWeight: 500 }}>{payout.staffName}</td>
                    <td data-label="From Date">{payout.fromDate}</td>
                    <td data-label="To Date">{payout.toDate}</td>
                    <td data-label="Days">{payout.numberOfDays}</td>
                    <td data-label="Month">{payout.targetMonth}</td>
                    <td data-label="Amount">£{payout.payoutAmount || '-'}</td>
                    <td data-label="Reason/Notes">{payout.notes || '-'}</td>
                    <td data-label="Status">
                      <span className={`badge badge-${payout.status}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td data-label="Actions">
                      {payout.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => setPayoutModal({ show: true, payoutId: payout._id, status: 'approved', amount: payout.payoutAmount || '', notes: payout.notes || '' })}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => updatePayoutStatus(payout._id, 'rejected', 0, '')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {payout.status === 'approved' && (
                        <button 
                          className="btn btn-info" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => updatePayoutStatus(payout._id, 'paid', payout.payoutAmount, payout.notes)}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No payout requests match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {payoutModal.show && (
          <div className="modal-overlay active">
            <div className="modal">
              <div className="modal-header">
                <h3>Approve Payout</h3>
                <button className="close-btn" onClick={() => setPayoutModal({ ...payoutModal, show: false })}>&times;</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                updatePayoutStatus(payoutModal.payoutId, payoutModal.status, payoutModal.amount, payoutModal.notes);
                setPayoutModal({ show: false, payoutId: '', status: '', amount: '', notes: '' });
              }}>
                <div className="form-group">
                  <label className="form-label">Payout Amount (£)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={payoutModal.amount}
                    onChange={(e) => setPayoutModal({ ...payoutModal, amount: e.target.value })}
                    placeholder="Enter payout amount"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    value={payoutModal.notes}
                    onChange={(e) => setPayoutModal({ ...payoutModal, notes: e.target.value })}
                    placeholder="Add notes (optional)"
                    rows="3"
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setPayoutModal({ ...payoutModal, show: false })}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Approve & Set Amount
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {activeTab === 'new-staff' && (
          <div style={{ maxWidth: '500px' }}>
            <form onSubmit={handleCreateStaff} className="stacked-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Create Staff Account
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
