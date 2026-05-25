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

  // NEW STAFF
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fileInputRef = useRef(null);

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

        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Import Staff
        </button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
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

                    {/* BUTTONS */}

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "1rem",
                        flexWrap: "wrap",
                      }}
                    >

                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          handleViewProfile(staff)
                        }
                      >
                        View Profile
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          handleDelete(
                            staff._id || staff.id
                          )
                        }
                      >
                        Delete
                      </button>

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

                    <td>{request.date}</td>

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