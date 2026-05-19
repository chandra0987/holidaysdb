import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Users, UserPlus, CheckCircle, XCircle, Calendar, Download } from 'lucide-react';

const AdminDashboard = () => {
  const { users, leaveRequests, createStaff, updateLeaveStatus } = useAuth();
  const [activeTab, setActiveTab] = useState('staff'); // staff, requests, new-staff
  
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

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'staff') {
      csvContent += "Name,Email,Total Days,Present Days,Leave Days\n";
      staffMembers.forEach(staff => {
        csvContent += `${staff.name},${staff.email},${staff.totalDays},${staff.presentDays},${staff.leaveDays}\n`;
      });
    } else if (activeTab === 'requests') {
      csvContent += "Staff Name,Date,Type,Reason,Status\n";
      leaveRequests.forEach(req => {
        const reason = req.reason.replace(/,/g, " "); // prevent comma collision
        csvContent += `${req.staffName},${req.date},${req.type || 'Regular'},${reason},${req.status}\n`;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Admin Dashboard</h2>
        {(activeTab === 'staff' || activeTab === 'requests') && (
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={18} /> Export CSV
          </button>
        )}
      </div>
      
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon blue"><Users size={24} /></div>
            <h3>Total Staff</h3>
          </div>
          <div className="stat-value">{staffMembers.length}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div className="stat-icon orange"><Calendar size={24} /></div>
            <h3>Pending Leaves</h3>
          </div>
          <div className="stat-value">
            {leaveRequests.filter(r => r.status === 'pending').length}
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
            className={`auth-tab ${activeTab === 'new-staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-staff')}
          >
            <UserPlus size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
            Add Staff
          </div>
        </div>

        {activeTab === 'staff' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Total Days</th>
                  <th>Present</th>
                  <th>Leave Days</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map(staff => (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: 500 }}>{staff.name}</td>
                    <td>{staff.email}</td>
                    <td>{staff.totalDays}</td>
                    <td>{staff.presentDays}</td>
                    <td>{staff.leaveDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {leaveRequests.map(request => (
                  <tr key={request.id}>
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
                            onClick={() => updateLeaveStatus(request.id, 'approved')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => updateLeaveStatus(request.id, 'rejected')}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'new-staff' && (
          <div style={{ maxWidth: '500px' }}>
            <form onSubmit={handleCreateStaff}>
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
