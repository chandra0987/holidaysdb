import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const AdminDashboard = () => {
  const {
    users,
    leaveRequests,
    createStaff,
    updateLeaveStatus,
    token,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("staff");

  const [staffList, setStaffList] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedStaff, setSelectedStaff] = useState(null);

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [openMenuId, setOpenMenuId] =
    useState(null);

  // CREATE STAFF
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setStaffList(
      users.filter((u) => u.role === "staff")
    );
  }, [users]);

  // =========================
  // HELPERS
  // =========================

  const getRemainingBalance = (staff) => {
    return (
      (staff.holidayEntitlement || 0) +
      (staff.carryOver || 0) -
      (staff.daysTaken || 0)
    );
  };

  // =========================
  // SEARCH
  // =========================

  const filteredStaff = staffList.filter(
    (staff) =>
      staff.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      staff.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      staff.department
        ?.toLowerCase()
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
      alert("Staff Created");

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
      "Delete this staff member?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL ||
          "http://localhost:5000"
        }/api/admin/staff/${id}`,
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
        throw new Error(data.message);
      }

      alert("Deleted Successfully");

      setStaffList((prev) =>
        prev.filter(
          (staff) =>
            staff._id !== id &&
            staff.id !== id
        )
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
          marginBottom: "20px",
        }}
      >
        <h2>Admin Dashboard</h2>
      </div>

      {/* TABS */}

      <div className="glass-panel">

        <div className="auth-tabs">

          <div
            className={`auth-tab ${
              activeTab === "staff"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("staff")
            }
          >
            Staff
          </div>

          <div
            className={`auth-tab ${
              activeTab === "requests"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("requests")
            }
          >
            Requests
          </div>

          <div
            className={`auth-tab ${
              activeTab === "new-staff"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("new-staff")
            }
          >
            Add Staff
          </div>

        </div>

        {/* SEARCH */}

        {activeTab === "staff" && (
          <div style={{ margin: "20px 0" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search Staff..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>
        )}

        {/* STAFF */}

        {activeTab === "staff" && (

          <div className="staff-card-grid">

            {filteredStaff.map((staff) => (

              <div
                key={staff._id}
                className="staff-card"
                style={{
                  position: "relative",
                }}
              >

                {/* 3 DOT MENU */}

                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                  }}
                >

                  <button
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === staff._id
                          ? null
                          : staff._id
                      )
                    }
                    style={{
                      border: "none",
                      background: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                    }}
                  >
                    ⋮
                  </button>

                  {openMenuId === staff._id && (

                    <div
                      style={{
                        position: "absolute",
                        top: "35px",
                        right: "0",
                        width: "150px",
                        background: "#fff",
                        borderRadius: "10px",
                        boxShadow:
                          "0 2px 10px rgba(0,0,0,0.2)",
                        zIndex: 100,
                      }}
                    >

                      <button
                        onClick={() => {
                          handleViewProfile(staff);
                          setOpenMenuId(null);
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "none",
                          padding: "12px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        View Profile
                      </button>

                      <button
                        onClick={() => {
                          handleDelete(
                            staff._id
                          );
                          setOpenMenuId(null);
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "none",
                          padding: "12px",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "red",
                        }}
                      >
                        Delete
                      </button>

                    </div>

                  )}

                </div>

                {/* STAFF INFO */}

                <h3>{staff.name}</h3>

                <p>
                  <strong>Email:</strong>{" "}
                  {staff.email}
                </p>

                <p>
                  <strong>Department:</strong>{" "}
                  {staff.department ||
                    "No Department"}
                </p>

                <p>
                  <strong>Remaining:</strong>{" "}
                  {getRemainingBalance(staff)}
                </p>

              </div>

            ))}

          </div>

        )}

        {/* REQUESTS */}

        {activeTab === "requests" && (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {leaveRequests.map((request) => (

                  <tr key={request._id}>

                    <td>
                      {request.staffName}
                    </td>

                    <td>{request.date}</td>

                    <td>{request.reason}</td>

                    <td>
                      {request.status}
                    </td>

                    <td>

                      {request.status ===
                        "pending" && (

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
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

        {/* ADD STAFF */}

        {activeTab === "new-staff" && (

          <form
            onSubmit={handleCreateStaff}
            className="stacked-form"
            style={{
              maxWidth: "500px",
            }}
          >

            <div className="form-group">
              <label>Name</label>

              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Create Staff
            </button>

          </form>

        )}

      </div>

      {/* PROFILE MODAL */}

      {showProfileModal &&
        selectedStaff && (

          <div className="modal-overlay active">

            <div className="modal">

              <div className="modal-header">

                <h3>
                  Staff Profile
                </h3>

                <button
                  className="close-btn"
                  onClick={() => {
                    setShowProfileModal(
                      false
                    );

                    setSelectedStaff(
                      null
                    );
                  }}
                >
                  ×
                </button>

              </div>

              <div
                className="stacked-form"
              >

                <div className="form-group">
                  <label>Name</label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      selectedStaff.name
                    }
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      selectedStaff.email
                    }
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>
                    Department
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      selectedStaff.department
                    }
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>
                    Holiday Entitlement
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      selectedStaff.holidayEntitlement
                    }
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>
                    Days Taken
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      selectedStaff.daysTaken
                    }
                    readOnly
                  />
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowProfileModal(
                      false
                    );

                    setSelectedStaff(
                      null
                    );
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