import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Users, UserPlus, CheckCircle, XCircle, Calendar, Download, Search, Upload } from 'lucide-react';

const AdminDashboard = () => {
  const { users, leaveRequests, holidayPayouts, duvetLogs, createStaff, updateLeaveStatus, updatePayoutStatus, fetchDuvetLogs, token } = useAuth();
  const [activeTab, setActiveTab] = useState('staff'); // staff, requests, duvet-logs, payouts, new-staff
  const [payoutModal, setPayoutModal] = useState({ show: false, payoutId: '', status: '', amount: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // New staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Imported staff data state
  const [importedStaff, setImportedStaff] = useState([]);
  const [isLoadingImported, setIsLoadingImported] = useState(false);
  const [selectedImportedStaff, setSelectedImportedStaff] = useState(new Set());
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [accountCreationResult, setAccountCreationResult] = useState(null);

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toText = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  };

  // Fetch imported staff data
  useEffect(() => {
    if (activeTab === 'imported-staff') {
      fetchImportedStaff();
    }
  }, [activeTab]);

  const fetchImportedStaff = async () => {
    setIsLoadingImported(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/imported-staff-leave`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setImportedStaff(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching imported staff:', error);
    } finally {
      setIsLoadingImported(false);
    }
  };

  const handleCreateAccountsFromImported = async () => {
    if (selectedImportedStaff.size === 0) {
      alert('Please select at least one staff member to create accounts');
      return;
    }

    setIsCreatingAccounts(true);
    try {
      const staffIds = Array.from(selectedImportedStaff);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/create-accounts-from-imported`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ staffIds })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAccountCreationResult({
          success: true,
          created: data.results.created,
          alreadyExists: data.results.alreadyExists,
          failed: data.results.failed,
          tempPassword: data.results.tempPassword,
          createdAccounts: data.results.createdAccounts || []
        });
        setSelectedImportedStaff(new Set());
        await fetchImportedStaff();
      } else {
        setAccountCreationResult({
          success: false,
          message: data.message
        });
      }
    } catch (error) {
      setAccountCreationResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsCreatingAccounts(false);
    }
  };

  const handleClearImportedStaff = async () => {
    const confirmed = window.confirm('Clear all imported staff data? This will remove the imported snapshot records only.');
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/imported-staff-leave`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to clear imported data');
      }

      setImportedStaff([]);
      setSelectedImportedStaff(new Set());
      alert(`Imported data cleared (${data.deletedCount || 0} records removed)`);
    } catch (error) {
      alert(error.message || 'Failed to clear imported data');
    }
  };

  const handleSelectImportedStaff = (staffId) => {
    const updated = new Set(selectedImportedStaff);
    if (updated.has(staffId)) {
      updated.delete(staffId);
    } else {
      updated.add(staffId);
    }
    setSelectedImportedStaff(updated);
  };

  const handleSelectAllImportedStaff = () => {
    if (selectedImportedStaff.size === importedStaff.length) {
      setSelectedImportedStaff(new Set());
    } else {
      const allIds = new Set(importedStaff.map(s => s._id));
      setSelectedImportedStaff(allIds);
    }
  };

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

  const handleUpdateLeaveStatus = async (requestId, status) => {
    const result = await updateLeaveStatus(requestId, status);
    if (!result?.success) {
      alert(result?.message || 'Failed to update request status');
      return;
    }

    if (activeTab === 'imported-staff') {
      await fetchImportedStaff();
    }
  };

  const staffMembers = users.filter(u => u.role === 'staff');
  const filteredStaff = staffMembers.filter(staff =>
    `${staff.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${staff.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${staff.department || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${staff.serviceYears ?? ''}`.includes(searchQuery)
  );

  const getRemainingBalance = (staff) =>
    toNumber(staff.remainingBalance, toNumber(staff.holidayEntitlement, 0) + toNumber(staff.carryOver, 0) - toNumber(staff.daysTaken, 0));

  const getOverdue = (staff) => {
    const balance = getRemainingBalance(staff);
    return balance < 0 ? Math.abs(balance) : 0;
  };

  const getDuvetStats = (staff) => ({
    used: toNumber(staff.duvetDaysUsed, 0),
    remaining: toNumber(staff.duvetRemaining, Math.max(0, 8 - toNumber(staff.duvetDaysUsed, 0)))
  });

  const csvValue = (value) => {
    const text = `${value ?? ''}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (rows, filename) => {
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${rows.join('\n')}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allRequests = [...leaveRequests];

  const filteredRequests = allRequests.filter(request =>
    `${request.staffName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${request.reason || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${request.type || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayouts = holidayPayouts?.filter(payout =>
    `${payout.staffName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${payout.targetMonth || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredDuvetLogs = (duvetLogs || []).filter(log =>
    `${log.staffName || log.userId?.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${log.note || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${log.date || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredImportedStaff = (importedStaff || []).filter(staff =>
    `${staff.staffName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${staff.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${staff.holidayEntitlementDays ?? ''}`.includes(searchQuery) ||
    `${staff.carryOverDays ?? ''}`.includes(searchQuery) ||
    `${staff.daysTakenSoFar ?? ''}`.includes(searchQuery) ||
    `${staff.remainingBalance ?? ''}`.includes(searchQuery) ||
    `${staff.serviceYears ?? ''}`.includes(searchQuery) ||
    `${staff.accountCreated ? 'created' : 'pending'}`.includes(searchQuery.toLowerCase()) ||
    `${staff.isWorking ? 'working' : 'not working'}`.includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    // Normalize the query and trigger any tab-specific actions
    const q = (searchQuery || '').toString().trim();
    setSearchQuery(q);

    // If user is viewing imported data, refetch to ensure latest before filtering
    if (activeTab === 'imported-staff') {
      fetchImportedStaff();
    } else if (activeTab === 'duvet-logs') {
      fetchDuvetLogs();
    }

    // For staff/requests/payouts the filtering is client-side (controlled by `searchQuery`),
    // so updating searchQuery above is sufficient to apply the filter and rerender.
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    // If viewing imported staff, refresh the data to show the full unfiltered list
    if (activeTab === 'imported-staff') {
      await fetchImportedStaff();
    } else if (activeTab === 'duvet-logs') {
      await fetchDuvetLogs();
    }
  };

  const exportToCSV = async () => {
    if (activeTab === 'staff') {
      try {
        setIsExporting(true);
        const rows = [
          ['Name', 'Email', 'Department', 'Holiday Entitlement', 'Carry Over', 'Days Taken', 'Remaining Balance', 'Duvet Days Used', 'Duvet Remaining', 'Service Years']
            .map(csvValue)
            .join(','),
          ...filteredStaff.map(staff => [
            staff.name,
            staff.email,
            staff.department,
            staff.holidayEntitlement ?? 0,
            staff.carryOver ?? 0,
            staff.daysTaken ?? 0,
            getRemainingBalance(staff),
            getDuvetStats(staff).used,
            getDuvetStats(staff).remaining,
            staff.serviceYears ?? 0
          ].map(csvValue).join(','))
        ];

        downloadCsv(rows, `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
      } catch (error) {
        alert(error.message || 'Failed to export CSV');
      } finally {
        setIsExporting(false);
      }
      return;
    }

    let rows = [];
    if (activeTab === 'requests') {
      rows = [
        ['Staff Name', 'Date', 'Type', 'Reason', 'Status', 'Source'].map(csvValue).join(','),
        ...filteredRequests.map(req => [
          req.staffName,
          req.date,
          req.type || 'Regular',
          req.reason,
          req.status,
          req.source || 'holiday-request'
        ].map(csvValue).join(','))
      ];
    } else if (activeTab === 'payouts') {
      rows = [
        ['Staff Name', 'From Date', 'To Date', 'Days', 'Target Month', 'Amount', 'Status', 'Notes'].map(csvValue).join(','),
        ...filteredPayouts.map(payout => [
          payout.staffName,
          payout.fromDate,
          payout.toDate,
          payout.numberOfDays,
          payout.targetMonth,
          payout.payoutAmount ?? 0,
          payout.status,
          payout.notes || ''
        ].map(csvValue).join(','))
      ];
    } else if (activeTab === 'duvet-logs') {
      rows = [
        ['Staff Name', 'Date', 'Note', 'Created At', 'Updated At'].map(csvValue).join(','),
        ...filteredDuvetLogs.map(log => [
          log.staffName || log.userId?.name || 'Unknown',
          log.date,
          log.note || '',
          log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
          log.updatedAt ? new Date(log.updatedAt).toLocaleDateString() : 'N/A'
        ].map(csvValue).join(','))
      ];
    } else if (activeTab === 'imported-staff') {
      rows = [
        ['Staff Name', 'Email', 'Department', 'Holiday Entitlement', 'Carry Over', 'Days Taken', 'Remaining Balance', 'Service Years', 'Duvet Days Used', 'Working', 'Account Status', 'Updated At'].map(csvValue).join(','),
        ...filteredImportedStaff.map(staff => [
          staff.staffName,
          staff.email,
          staff.department,
          staff.holidayEntitlementDays ?? 28,
          staff.carryOverDays ?? 0,
          staff.daysTakenSoFar ?? 0,
          staff.remainingBalance ?? (toNumber(staff.holidayEntitlementDays, 28) + toNumber(staff.carryOverDays, 0) - toNumber(staff.daysTakenSoFar, 0)),
          staff.serviceYears ?? 0,
          staff.duvetDaysUsed ?? 0,
          staff.isWorking ? 'Working' : 'Not Working',
          staff.accountCreated ? 'Created' : 'Pending',
          staff.updatedAt ? new Date(staff.updatedAt).toLocaleDateString() : 'N/A'
        ].map(csvValue).join(','))
      ];
    }

    if (rows.length === 0) {
      alert('No exportable data found for this section');
      return;
    }

    downloadCsv(rows, `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImportStaff = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext) || !validTypes.includes(file.type)) {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/staff/upload`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      alert(` File uploaded successfully!\n\nRecords processed: ${data.stats.totalRows}\nInserted: ${data.stats.inserted}\nUpdated: ${data.stats.updated}`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Fetch and display the imported data
      setActiveTab('imported-staff');
      await fetchImportedStaff();
    } catch (error) {
      alert(` Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Admin Dashboard</h2>
        {(activeTab === 'staff' || activeTab === 'requests' || activeTab === 'payouts' || activeTab === 'imported-staff') && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeTab === 'staff' && (
              <>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading}
                >
                  <Upload size={18} /> {isUploading ? 'Importing...' : 'Import Staff'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportStaff}
                  style={{ display: 'none' }}
             ></input>
              </>
            )}
            <button className="btn btn-secondary" onClick={exportToCSV} disabled={isExporting}>
              <Download size={18} /> {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
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
            className={`auth-tab ${activeTab === 'duvet-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('duvet-logs')}
          >
            Duvet Logs
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
          <div 
            className={`auth-tab ${activeTab === 'imported-staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('imported-staff')}
          >
            Imported Data
          </div>
        </div>

        {(activeTab === 'staff' || activeTab === 'requests' || activeTab === 'duvet-logs' || activeTab === 'payouts' || activeTab === 'imported-staff') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 320px' }}>
              <input
                type="text"
                className="form-control"
                placeholder={activeTab === 'staff' ? 'Search staff by name, department or years' : activeTab === 'payouts' ? 'Search payouts by staff name or month' : activeTab === 'imported-staff' ? 'Search imported staff by name' : activeTab === 'duvet-logs' ? 'Search duvet logs by name, note or date' : 'Search requests by name, type or reason'}
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

          <div className="staff-card-grid">
            {filteredStaff.length > 0 ? filteredStaff.map(staff => {
              const remainingBalance = getRemainingBalance(staff);
              const overdue = getOverdue(staff);
              const duvetStats = getDuvetStats(staff);
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
                    <div>{`Duvet Logged: ${duvetStats.used}`}</div>
                    <div>{`Duvet Remaining: ${duvetStats.remaining}`}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-card">
                No staff members available.
              </div>
            )}

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
                      <span className={`badge ${request.source === 'duvet' ? 'badge-approved' : `badge-${request.status}`}`}>
                        {request.source === 'duvet' ? 'Logged' : request.status}
                      </span>
                    </td>
                    <td>
                      {request.source !== 'duvet' && request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleUpdateLeaveStatus(request._id, 'approved')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleUpdateLeaveStatus(request._id, 'rejected')}
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
        {activeTab === 'duvet-logs' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredDuvetLogs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 500 }}>{log.staffName || log.userId?.name || 'Unknown'}</td>
                    <td>{log.date}</td>
                    <td>{log.note || '-'}</td>
                    <td>{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
                {filteredDuvetLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No duvet logs match your search.
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
        {activeTab === 'imported-staff' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Imported Staff Leave Data</h3>
                {importedStaff.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleClearImportedStaff}
                    >
                      Clear Imported Data
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={handleCreateAccountsFromImported}
                      disabled={selectedImportedStaff.size === 0 || isCreatingAccounts}
                    >
                      {isCreatingAccounts ? 'Creating Accounts...' : `Create Accounts (${selectedImportedStaff.size})`}
                    </button>
                  </div>
                )}
              </div>

              {isLoadingImported ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading imported staff data...
                </div>
              ) : importedStaff.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No imported staff data yet. Upload an Excel file to see the data here.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(100, 150, 255, 0.1)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', width: '40px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedImportedStaff.size === importedStaff.length && importedStaff.length > 0}
                            onChange={handleSelectAllImportedStaff}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Staff Name</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Holiday Entitlement</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Carry Over Days</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Days Taken So Far</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Remaining Balance</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Service Years</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Duvet Days Used</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Working</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Account Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedStaff.map((staff, index) => (
                        <tr 
                          key={staff._id || index} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedImportedStaff.has(staff._id)}
                              onChange={() => handleSelectImportedStaff(staff._id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <strong>{toText(staff.staffName)}</strong>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {toText(staff.email)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {toNumber(staff.holidayEntitlementDays, 28)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {toNumber(staff.carryOverDays, 0)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {toNumber(staff.daysTakenSoFar, 0)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                            {toNumber(staff.remainingBalance, toNumber(staff.holidayEntitlementDays, 28) + toNumber(staff.carryOverDays, 0) - toNumber(staff.daysTakenSoFar, 0))}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {toNumber(staff.serviceYears, 0)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {toNumber(staff.duvetDaysUsed, 0)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(staff.isWorking)}
                                onChange={async (e) => {
                                  const newVal = e.target.checked;
                                  // optimistic update
                                  setImportedStaff(prev => prev.map(p => p._id === staff._id ? { ...p, isWorking: newVal } : p));
                                  try {
                                    const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/imported-staff/${staff._id}/working`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                                      },
                                      body: JSON.stringify({ isWorking: newVal })
                                    });
                                    if (!resp.ok) {
                                      throw new Error('Failed to update status');
                                    }
                                    const body = await resp.json();
                                    if (body && body.data) {
                                      // sync returned record
                                      setImportedStaff(prev => prev.map(p => p._id === staff._id ? body.data : p));
                                    }
                                  } catch (err) {
                                    // revert on error
                                    setImportedStaff(prev => prev.map(p => p._id === staff._id ? { ...p, isWorking: staff.isWorking } : p));
                                    alert(err.message || 'Failed to update working status');
                                  }
                                }}
                              />
                              <span style={{ fontSize: '0.85rem' }}>{staff.isWorking ? 'Yes' : 'No'}</span>
                            </label>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span className={`badge ${staff.accountCreated ? 'badge-approved' : 'badge-pending'}`}>
                              {staff.accountCreated ? 'Created' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(100, 150, 255, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Total Records:</strong> {importedStaff.length} | <strong>Selected:</strong> {selectedImportedStaff.size}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Creation Result Modal */}
        {accountCreationResult && (
          <div className="modal-overlay active">
            <div className="modal">
              <div className="modal-header">
                <h3>{accountCreationResult.success ? '✓ Accounts Created Successfully' : '✗ Account Creation Failed'}</h3>
                <button className="close-btn" onClick={() => setAccountCreationResult(null)}>&times;</button>
              </div>
              
              {accountCreationResult.success ? (
                <div className="stacked-form">
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>✓ Created:</strong> {accountCreationResult.created} accounts
                    </p>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>⚠ Already Exists:</strong> {accountCreationResult.alreadyExists} accounts
                    </p>
                    {accountCreationResult.failed > 0 && (
                      <p style={{ marginBottom: '0' }}>
                        <strong>✗ Failed:</strong> {accountCreationResult.failed} accounts
                      </p>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 193, 7, 0.15)', borderRadius: 'var(--radius-sm)', border: '2px solid #FFC107', marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#FF9800' }}>📋 Temporary Password for All Staff</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={accountCreationResult.tempPassword} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '0.75rem', 
                          fontSize: '1.1rem', 
                          fontWeight: 'bold', 
                          border: '1px solid #FFC107',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}
                      />
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(accountCreationResult.tempPassword);
                          alert('Password copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      ⚠️ Share this password with all newly created staff. They should change it on first login.
                    </p>
                  </div>

                  {accountCreationResult.createdAccounts?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.75rem' }}>Created Credentials</h4>
                      <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.75rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Password</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountCreationResult.createdAccounts.map((account, index) => (
                              <tr key={`${account.email}-${index}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                <td style={{ padding: '0.75rem' }}>{account.name || '-'}</td>
                                <td style={{ padding: '0.75rem' }}>{account.email || '-'}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{account.password}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => setAccountCreationResult(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="stacked-form">
                  <p style={{ color: '#f44336', marginBottom: '1.5rem' }}>
                    {accountCreationResult.message}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setAccountCreationResult(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
