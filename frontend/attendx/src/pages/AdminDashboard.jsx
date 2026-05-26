import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const AdminDashboard = () => {
  const {
    users,
    leaveRequests,
    holidayPayouts,
    duvetLogs,
    createStaff,
    updateLeaveStatus,
    updatePayoutStatus,
    fetchDuvetLogs,
    token,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("staff");

  const [searchQuery, setSearchQuery] = useState("");

  const [staffList, setStaffList] = useState([]);

  // PROFILE MODAL
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // NEW STAFF
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fileInputRef = useRef(null);

  const [importedStaff, setImportedStaff] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    setStaffList(users.filter((u) => u.role === "staff"));
  }, [users]);

  // =========================
  // HELPERS
  // =========================

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatDate = (val) => {
    if (!val || typeof val !== "string") return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatDateRange = (request) => {
    const fromDate = formatDate(request.fromDate) || formatDate(request.date);
    const toDate = formatDate(request.toDate);
    if (fromDate && toDate && fromDate !== toDate) return `${fromDate} - ${toDate}`;
    if (fromDate) return fromDate;
    return "—";
  };

  const getRemainingBalance = (staff) =>
    toNumber(staff.remainingBalance,
      toNumber(staff.holidayEntitlement, 0) +
      toNumber(staff.carryOver, 0) -
      toNumber(staff.daysTaken, 0)
    );

  const getOverdue = (staff) => {
    const balance = getRemainingBalance(staff);
    return balance < 0 ? Math.abs(balance) : 0;
  };

  const getDuvetStats = (staff) => ({
    used: toNumber(staff.duvetDaysUsed, 0),
    remaining: toNumber(
      staff.duvetRemaining,
      Math.max(0, 8 - toNumber(staff.duvetDaysUsed, 0))
    ),
  });

  // =========================
  // FILTER STAFF
  // =========================

  const filteredStaff = staffList.filter(
    (staff) =>
      `${staff.name || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      `${staff.email || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      `${staff.department || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  // =========================
  // CREATE STAFF
  // =========================

  const handleCreateStaff = async (e) => {
    e.preventDefault();

    const result = await createStaff({
      name,
      email,
      password,
    });

    if (result.success) {
      alert("Staff created successfully");

      setName("");
      setEmail("");
      setPassword("");

      setActiveTab("staff");
    } else {
      alert(result.message);
    }
  };

  // =========================
  // VIEW PROFILE
  // =========================

  const handleViewProfile = (staff) => {
    setSelectedStaff(staff);
    setShowProfileModal(true);
  };

  // =========================
  // IMPORT EXCEL
  // =========================

  const fetchImportedStaff = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/imported-staff-leave`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (data.success) setImportedStaff(data.data || []);
    } catch (error) {
      console.error("Failed to fetch imported staff", error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImportLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/staff/upload`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");

      await fetchImportedStaff();
      setActiveTab("import");
      alert(data.message);
    } catch (error) {
      alert(error.message);
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  const handleCreateAccounts = async () => {
    if (!window.confirm("Create staff accounts from all imported records?")) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/create-accounts-from-imported`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create accounts");
      alert(data.message);
      setActiveTab("staff");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleClearImported = async () => {
    if (!window.confirm("Clear all imported staff data?")) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/imported-staff-leave`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to clear data");
      setImportedStaff([]);
      alert(data.message || "Cleared successfully");
    } catch (error) {
      alert(error.message);
    }
  };

  // =========================
  // EXPORT CSV
  // =========================

  const handleExportCSV = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/export-csv`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    }
  };

  // =========================
  // DELETE STAFF
  // =========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this staff member?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/staff/${id}`,
        {
          method: "DELETE",
          headers: {
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      alert("Staff deleted successfully");

      setStaffList((prev) =>
        prev.filter((staff) => staff._id !== id && staff.id !== id)
      );
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="container fade-in">

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2>Admin Dashboard</h2>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>

          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            Export CSV
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
          >
            {importLoading ? "Uploading..." : "Import Staff"}
          </button>

        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* STATS */}

      <div className="dashboard-grid">

        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <h3>Total Staff</h3>
          </div>

          <div className="stat-value">{staffList.length}</div>
        </div>

        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <h3>Pending Leaves</h3>
          </div>

          <div className="stat-value">
            {leaveRequests.filter((r) => r.status === "pending").length}
          </div>
        </div>

        <div className="glass-panel stat-card atm-card">
          <div className="stat-header">
            <h3>Pending Payouts</h3>
          </div>

          <div className="stat-value">
            {holidayPayouts?.filter((p) => p.status === "pending").length || 0}
          </div>
        </div>

      </div>

      {/* TABS */}

      <div className="glass-panel">

        <div className="auth-tabs">

          <div
            className={`auth-tab ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => setActiveTab("staff")}
          >
            Staff Directory
          </div>

          <div
            className={`auth-tab ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Leave Requests
          </div>

          <div
            className={`auth-tab ${activeTab === "new-staff" ? "active" : ""}`}
            onClick={() => setActiveTab("new-staff")}
          >
            Add Staff
          </div>

          <div
            className={`auth-tab ${activeTab === "import" ? "active" : ""}`}
            onClick={() => {
              fetchImportedStaff();
              setActiveTab("import");
            }}
          >
            Import Data
          </div>

        </div>

        {/* SEARCH */}

        {activeTab === "staff" && (
          <div
            style={{
              marginBottom: "1.5rem",
              marginTop: "1rem",
            }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Search Staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* STAFF TAB */}

        {activeTab === "staff" && (

          <div className="staff-card-grid">

            {filteredStaff.length > 0 ? (

              filteredStaff.map((staff) => {

                const remainingBalance =
                  getRemainingBalance(staff);

                const overdue =
                  getOverdue(staff);

                const duvetStats =
                  getDuvetStats(staff);

                return (

                  <div
                    className="staff-card"
                    key={staff._id || staff.id}
                    onClick={() => setOpenMenuId(null)}
                  >

                    <div className="staff-card-top">

                      <div>
                        <div className="staff-card-label">
                          Name
                        </div>

                        <div className="staff-card-value">
                          {staff.name}
                        </div>
                      </div>

                      <div className="staff-card-badge">
                        <span className="badge badge-approved">
                          {staff.department || "No Dept"}
                        </span>
                      </div>

                    </div>

                    <div className="staff-card-row">

                      <div>
                        <div className="staff-card-label">
                          Remaining Balance
                        </div>

                        <div className="staff-card-value">
                          {remainingBalance}
                        </div>
                      </div>

                      <div>
                        <div className="staff-card-label">
                          Overdue
                        </div>

                        <div
                          className={`staff-card-value ${
                            overdue > 0
                              ? "overdue"
                              : "normal"
                          }`}
                        >
                          {overdue}
                        </div>
                      </div>

                    </div>

                    <div className="staff-card-meta">

                      <div>
                        Entitlement:
                        {staff.holidayEntitlement || 0}
                      </div>

                      <div>
                        Taken:
                        {staff.daysTaken || 0}
                      </div>

                      <div>
                        Duvet Used:
                        {duvetStats.used}
                      </div>

                      <div>
                        Duvet Remaining:
                        {duvetStats.remaining}
                      </div>

                    </div>

                    {/* 3-DOT MENU */}

                    <div style={{ position: "relative", marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}
                      onClick={(e) => e.stopPropagation()}
                    >

                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === (staff._id || staff.id)
                              ? null
                              : (staff._id || staff.id)
                          )
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.4rem",
                          lineHeight: 1,
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          color: "#000000",
                        }}
                        title="Options"
                      >
                        &#8942;
                      </button>

                      {openMenuId === (staff._id || staff.id) && (
                        <div
                          style={{
                            position: "absolute",
                            top: "110%",
                            right: 0,
                            background: "var(--card-bg, #000000)",
                            border: "1px solid var(--border-color, #faf0f0)",
                            borderRadius: "8px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                            zIndex: 100,
                            minWidth: "130px",
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleViewProfile(staff);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "0.6rem 1rem",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ffffff",
                              fontSize: "0.9rem",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 15, 15, 0.91)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                          >
                            View
                          </button>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDelete(staff._id || staff.id);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "0.6rem 1rem",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ffffff",
                              fontSize: "0.9rem",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 15, 15, 0.91)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                          >
                            Delete
                          </button>

                        </div>
                      )}

                    </div>

                  </div>
                );
              })

            ) : (

              <div className="empty-card">
                No staff members found
              </div>

            )}

          </div>
        )}

        {/* REQUESTS TAB */}

        {activeTab === "requests" && (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {leaveRequests.map((request) => (

                  <tr key={request._id}>

                    <td>{request.staffName}</td>

                    <td>{formatDateRange(request)}</td>

                    <td>{request.reason}</td>

                    <td>
                      <span
                        className={`badge badge-${request.status}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td>

                      {request.status === "pending" && (

                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                          }}
                        >

                          <button
                            className="btn btn-success"
                            onClick={() =>
                              updateLeaveStatus(
                                request._id,
                                "approved"
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="btn btn-danger"
                            onClick={() =>
                              updateLeaveStatus(
                                request._id,
                                "rejected"
                              )
                            }
                          >
                            Reject
                          </button>

                        </div>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {/* NEW STAFF */}

        {activeTab === "new-staff" && (

          <div style={{ maxWidth: "500px" }}>

            <form
              onSubmit={handleCreateStaff}
              className="stacked-form"
            >

              <div className="form-group">

                <label className="form-label">
                  Full Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Email
                </label>

                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Password
                </label>

                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

              </div>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Staff
              </button>

            </form>

          </div>

        )}

        {/* IMPORT DATA TAB */}

        {activeTab === "import" && (

          <div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >

              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                {importLoading ? "Uploading..." : "Upload Excel"}
              </button>

              {importedStaff.length > 0 && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateAccounts}
                  >
                    Create Accounts ({importedStaff.length})
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={handleClearImported}
                  >
                    Clear Data
                  </button>
                </>
              )}

            </div>

            {importedStaff.length > 0 ? (

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Entitlement (days)</th>
                      <th>Carry Over</th>
                      <th>Service Years</th>
                      <th>Duvet Used</th>
                    </tr>
                  </thead>

                  <tbody>

                    {importedStaff.map((record) => (

                      <tr key={record._id}>
                        <td>{record.staffName}</td>
                        <td>{record.holidayEntitlementDays ?? "-"}</td>
                        <td>{record.carryOverDays ?? "-"}</td>
                        <td>{record.serviceYears ?? "-"}</td>
                        <td>{record.duvetDaysUsed ?? "-"}</td>
                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="empty-card">
                No imported data. Upload an Excel file to preview records before creating accounts.
              </div>

            )}

          </div>

        )}

      </div>

      {/* PROFILE MODAL */}

      {showProfileModal && selectedStaff && (

        <div className="modal-overlay active">

          <div className="modal">

            <div className="modal-header">

              <h3>Staff Profile</h3>

              <button
                className="close-btn"
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedStaff(null);
                }}
              >
                &times;
              </button>

            </div>

            <div className="stacked-form">

              <div className="form-group">

                <label className="form-label">
                  Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={selectedStaff.name || ""}
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Email
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={selectedStaff.email || ""}
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Department
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={selectedStaff.department || ""}
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Holiday Entitlement
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={
                    selectedStaff.holidayEntitlement || 0
                  }
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Days Taken
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={selectedStaff.daysTaken || 0}
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Remaining Balance
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={getRemainingBalance(selectedStaff)}
                  readOnly
                />

              </div>

              <div className="form-group">

                <label className="form-label">
                  Service Years
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={selectedStaff.serviceYears || 0}
                  readOnly
                />

              </div>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedStaff(null);
                }}
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default AdminDashboard;