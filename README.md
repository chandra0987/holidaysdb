# HolidaysDB - Holiday & Leave Management System

A comprehensive leave and holiday management system with duvet-day tracking, admin controls, and real-time dashboard updates.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Application Flow](#application-flow)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Important Notes](#important-notes)

---

## Overview

**HolidaysDB** is a full-stack web application designed to streamline holiday and leave management for organizations. It allows:

- **Staff** to request holidays and log duvet days (with yearly limits)
- **Admins** to approve/reject requests, view comprehensive reports, and export payroll data
- **Real-time tracking** of leave balances and duvet-day usage

### Key Innovation: Duvet Day Yearly Limit
- **Hard limit: 8 duvet days per calendar year** (enforced server-side)
- Staff cannot exceed this limit
- Usage resets on January 1st annually
- Admin can view all duvet logs with staff names and dates

---

## Key Features

### For Staff
- **Dashboard** with leave balance and duvet days remaining
- **Request Leave** - submit holiday or duvet-day requests
- **Duvet Day Logging** - log duvet days (1-day increments, max 8/year)
- **Holiday Payout** - apply for holiday payouts
- **View Requests** - track submitted requests and their status

### For Admins
- **Admin Dashboard** - overview of all staff and requests
- **Approve/Reject Requests** - manage leave and duvet-day requests
- **Duvet Logs** - view all duvet days logged with staff names and dates
- **Staff Statistics** - see duvet days used/remaining for each staff member
- **Payroll Export** - export data to CSV for payroll processing
- **Staff Management** - add, edit, and manage staff records

### Security
- **JWT Authentication** - secure token-based authentication
- **Role-based Access** - staff vs. admin views
- **Automatic Session Expiry** - 401 handling with auto-logout
- **Environment Variables** - sensitive data (DB credentials, JWT secret) protected

---

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (jsonwebtoken)
- **Additional:** cors, dotenv, multer, bcryptjs, csv-writer

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** CSS
- **HTTP Client:** Fetch API
- **State Management:** Context API (AuthContext)

### Development
- **Backend Dev Server:** Nodemon
- **Package Manager:** npm

---

## Application Flow

### **1. Authentication Flow**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Enter email & password
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Query user by email
    Database-->>Backend: User found
    Backend->>Backend: Verify password hash
    alt Valid Credentials
        Backend->>Backend: Generate JWT token
        Backend-->>Frontend: Return token + user data
        Frontend->>Frontend: Store token in localStorage
        Frontend->>User: Redirect to Dashboard
    else Invalid Credentials
        Backend-->>Frontend: Return 401 error
        Frontend->>User: Show "Invalid credentials"
    end
    
    Note over Frontend: Session Management
    alt Token Expired (401)
        Frontend->>Frontend: Detect 401 response
        Frontend->>Frontend: Clear token & localStorage
        Frontend->>User: Redirect to Login
    end
```

---

### **2. Staff Leave Request Flow**

```mermaid
flowchart TD
    A[Staff Views Dashboard] --> B[Click Request Leave Button]
    B --> C[Select Request Type]
    C -->|Holiday| D[Enter Days Needed]
    C -->|Duvet Day| E[Days Auto-set to 1]
    D --> F[Select Date Range]
    E --> F
    F --> G[Add Reason/Notes]
    G --> H[Submit Form]
    
    H --> I{Backend Validation}
    I -->|No Auth| J[Return 401]
    I -->|For Duvet: Check Limit| K{Used < 8 Days?}
    K -->|No| L[Return 400 - Limit Exceeded]
    K -->|Yes| M[Create Record]
    I -->|For Holiday: Valid Data?| N{Data Valid?}
    N -->|No| O[Return 400 - Invalid Data]
    N -->|Yes| M
    
    J --> P[Frontend Shows Error]
    L --> P
    O --> P
    M --> Q[Save to Database]
    Q --> R[Return Success]
    R --> S[Show Toast Notification]
    S --> T[Update Dashboard Stats]
    
    T --> U[Request Appears in Admin Dashboard]
    U --> V[Admin Reviews Request]
    V -->|Approve| W[Update Status in DB]
    V -->|Reject| W
    W --> X[Staff Sees Updated Status]
```

---

### **3. Duvet Day Yearly Limit Enforcement**

```mermaid
flowchart TD
    A[Staff Requests Duvet Day] --> B[Backend Receives Request]
    B --> C[Count Duvet Days for Current Year]
    C --> D[Query Day Collection]
    D --> E["Filter: Jan 1 ≤ createdAt < Jan 1 next year"]
    E --> F[Get Count]
    
    F --> G{Count >= 8?}
    G -->|Yes| H[Return 400 Error]
    H --> I[Frontend Disables Duvet Option]
    I --> J[Show 'Limit Exceeded' Message]
    
    G -->|No| K[Allow Request]
    K --> L[Create Day Document]
    L --> M[Increment duvetDaysUsed]
    M --> N[Save to Database]
    N --> O[Return Success]
    
    P["Annual Reset: Jan 1"] -->|New Year| Q[Count Resets to 0]
    Q --> R[No Manual Action Needed]
```

---

### **4. Admin Dashboard Flow**

```mermaid
graph TD
    A["Admin Dashboard<br/>(Multiple Tabs)"]
    
    A --> B["📋 Tab 1: Staff List"]
    B --> B1["View All Staff Members"]
    B1 --> B2["Display: Name, Email, Role<br/>Duvet Stats: Used/Remaining"]
    B2 --> B3["Actions: Edit, Delete, View Details<br/>Button: Add New Staff"]
    
    A --> C["📝 Tab 2: Leave Requests"]
    C --> C1["Combined Request List"]
    C1 --> C2["Holiday Requests"]
    C1 --> C3["Duvet Logs"]
    C2 --> C2a["Status: Pending, Approved, Rejected<br/>Actions: Approve/Reject Buttons"]
    C3 --> C3a["Status: Logged Read-Only<br/>No Action Buttons"]
    
    A --> D["💰 Tab 3: Holiday Payouts"]
    D --> D1["View Payout Requests"]
    D1 --> D2["Status: Pending, Approved, Processed<br/>Actions: Approve/Reject/Process"]
    
    A --> E["📊 Tab 4: Reports"]
    E --> E1["Export Options"]
    E1 --> E2["Filters: Date Range, Staff Name<br/>Export Format: CSV for Payroll"]
```

---

### **5. System Data Flow**

```mermaid
graph TB
    User["👤 User<br/>(Staff/Admin)"]
    Login["🔐 Login Page"]
    Auth["🔑 AuthContext<br/>JWT + User Info<br/>localStorage: attendx_token"]
    
    StaffDash["📊 Staff Dashboard"]
    AdminDash["📊 Admin Dashboard"]
    
    Backend["🖥️ Express Server<br/>Port 5000"]
    
    Auth1["POST /api/auth/login<br/>POST /api/auth/register"]
    Auth2["POST /api/auth/admin-register"]
    
    StaffAPI["GET /api/staff/profile<br/>POST /api/staff/duvet-day<br/>POST /api/staff/holiday-request<br/>GET /api/staff/requests"]
    
    AdminAPI["GET /api/admin/all-staff<br/>GET /api/admin/requests<br/>PUT /api/admin/requests/:id<br/>GET /api/admin/duvet-logs<br/>GET /api/admin/export-csv<br/>POST/PUT/DELETE /api/admin/staff"]
    
    DB["💾 MongoDB<br/>(Collections:<br/>Users, HolidayRequests,<br/>Days, HolidayPayouts)"]
    
    User --> Login
    Login --> Auth
    Auth --> StaffDash
    Auth --> AdminDash
    
    StaffDash --> StaffAPI
    AdminDash --> AdminAPI
    
    Auth1 --> Backend
    Auth2 --> Backend
    StaffAPI --> Backend
    AdminAPI --> Backend
    
    Backend --> DB
    
    DB -.->|Query Results| Backend
    Backend -.->|API Response| StaffDash
    Backend -.->|API Response| AdminDash
```

---

## Setup Instructions

### Prerequisites
- **Node.js** (v14+)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### 1. Clone Repository
```bash
git clone <repository-url>
cd holidaysdb
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MONGO_URI=mongodb://localhost:27017/holidaysdb
JWT_SECRET=your_jwt_secret_here
PORT=5000
EOF

# Ensure MongoDB is running
# On Windows (if MongoDB installed locally):
#   mongod
# Or use MongoDB Atlas (update MONGO_URI in .env)
```

### 3. Frontend Setup

```bash
cd ../frontend/attendx

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000
EOF
```

---

## Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
MongoDB Connected
Server running on port 5000
```

### Start Frontend

In a new terminal:

```bash
cd frontend/attendx
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## Project Structure

```
holidaysdb/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Login/register logic
│   │   ├── staffControlller.js     # Staff duvet & profile endpoints
│   │   └── adminController.js      # Admin requests & exports
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification middleware
│   │   └── upload.js               # File upload handling
│   ├── models/
│   │   ├── User.js                 # User schema (staff/admin)
│   │   ├── Day.js                  # Duvet day log schema
│   │   ├── HolidayRequest.js       # Holiday request schema
│   │   ├── HolidayPayout.js        # Payout request schema
│   │   └── StaffLeave.js           # (Legacy) leave schema
│   ├── routes/
│   │   ├── authRoutes.js           # Auth endpoints
│   │   ├── staffRoutes.js          # Staff endpoints
│   │   └── adminRoutes.js          # Admin endpoints
│   ├── .env                        # Environment variables (not committed)
│   ├── package.json                # Dependencies
│   └── server.js                   # Express server entry point
│
├── frontend/
│   └── attendx/
│       ├── src/
│       │   ├── context/
│       │   │   └── AuthContext.jsx # Global auth state + API calls
│       │   ├── hooks/
│       │   │   └── useAuth.js      # Custom auth hook
│       │   ├── pages/
│       │   │   ├── Login.jsx       # Staff/admin login page
│       │   │   ├── AdminLogin.jsx  # (Alternative) admin login
│       │   │   ├── StaffDashboard.jsx    # Staff dashboard
│       │   │   ├── AdminDashboard.jsx    # Admin dashboard
│       │   │   ├── HolidayRequest.jsx    # Holiday payout form
│       │   │   └── (other pages)
│       │   ├── App.jsx             # Main app component
│       │   ├── main.jsx            # React entry point
│       │   └── index.css           # Global styles
│       ├── .env                    # Frontend env vars (not committed)
│       ├── package.json            # Dependencies
│       ├── vite.config.js          # Vite configuration
│       └── index.html              # HTML template
│
├── .gitignore                      # Ignore .env, node_modules, etc.
└── README.md                       # This file
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (staff/admin)
- `POST /api/auth/register` - Register new staff member
- `POST /api/auth/admin-register` - Register admin (admin only)

### Staff Endpoints
- `GET /api/staff/profile` - Get staff profile + duvet stats
- `POST /api/staff/duvet-day` - Log duvet day (enforces 8-day limit)
- `POST /api/staff/holiday-request` - Submit holiday request
- `GET /api/staff/requests` - Get staff's requests

### Admin Endpoints
- `GET /api/admin/all-staff` - List all staff with duvet stats
- `GET /api/admin/requests` - List all leave requests
- `PUT /api/admin/requests/:id` - Approve/reject request
- `GET /api/admin/duvet-logs` - Get all duvet logs (with staff names)
- `GET /api/admin/export-csv` - Export payroll data
- `POST /api/admin/staff` - Add new staff member
- `PUT /api/admin/staff/:id` - Edit staff member
- `DELETE /api/admin/staff/:id` - Remove staff member

---

## Important Notes

### 1. **Environment Variables**
- `.env` files are **NOT** committed to git (see `.gitignore`)
- Create `.env` locally in `backend/` and `frontend/attendx/`
- **Never commit secrets** (DB credentials, JWT secret)

### 2. **MongoDB Connection**
- **Local:** `mongodb://localhost:27017/holidaysdb`
- **Atlas (Cloud):** Use explicit host list URI to avoid SRV DNS issues
  ```
  mongodb://host1:27017,host2:27017,host3:27017/holidaysdb
  ```

### 3. **Duvet Day Limit**
- **Limit:** 8 duvet days per calendar year (Jan 1 - Dec 31)
- **Enforcement:** Server-side (backend counts `Day` documents)
- **Reset:** Automatic on January 1st (no manual action needed)
- **Edge Case:** If user tries to log duvet on Dec 31, it counts toward current year (not next year)

### 4. **JWT Token Handling**
- Token stored in `localStorage` as `attendx_token`
- Token automatically cleared on 401 (invalid/expired)
- User logged out and redirected to login page
- No manual "logout" needed for expired tokens

### 5. **Duvet Logs in Admin Dashboard**
- Duvet logs appear in "Leave Requests" tab
- Staff name populated via `.populate("userId", "name")` in `Day` model
- Marked with "Logged" badge (read-only, no approve/reject buttons)
- Mixed with regular holiday requests in same table

### 6. **Database Models**
- **User:** Staff/admin credentials + profile info + `duvetDaysUsed` (cache)
- **Day:** Duvet day logs with `userId` reference (not incremental counter)
- **HolidayRequest:** Leave requests (pending, approved, rejected)
- **HolidayPayout:** Payout requests for unused holidays

---

## Troubleshooting

### MongoDB Connection Error
```
MongoDB connection failed: The `uri` parameter to `openUri()` must be a string, got "undefined"
```
**Fix:** Ensure `.env` file exists in `backend/` with `MONGO_URI` defined.

### Frontend API Calls Fail (404/CORS)
```
CORS error or API not found
```
**Fix:** Verify `VITE_API_URL` in `frontend/.env` matches backend port (default: `http://localhost:5000`).

### Duvet Limit Not Enforced
**Fix:** Backend counts `Day` documents for the calendar year. Ensure:
1. MongoDB is connected
2. Duvet day was saved to `Day` collection
3. Query filters by current year (`createdAt` field)

### Session Expires Unexpectedly
**Fix:** Check JWT expiry time in backend auth controller. Increase token lifetime if needed.

---

## License

[Your License Here]

---

**Last Updated:** May 2026  
**Version:** 1.0.0  
**Status:** Production-Ready
