# Holiday Management System - Comprehensive Analysis

## 📋 System Overview
A full-stack holiday and leave management system built with Node.js/Express backend and React/Vite frontend. The system manages staff holidays, duvet days, payouts, and provides admin dashboards for oversight.

---

## 🗄️ DATABASE MODELS (MongoDB)

### 1. **User Model** ([backend/models/User.js](backend/models/User.js))
**Purpose:** Core user entity for both staff and admins
**Key Fields:**
- `name`, `email`, `password` - Authentication credentials
- `role` - "staff" or "admin" (enum)
- `department`, `serviceYears` - Employment info
- `holidayEntitlement` - Base annual allowance (e.g., 20-28 days)
- `carryOver` - Days carried from previous year
- `daysTaken` - Total days used in current period
- `duvetDaysUsed` - Duvet days logged
- `isWorking` - Live working/not-working flag used by staff/admin views

**Connections:** Referenced in HolidayRequest, StaffLeave, Day models

---

### 2. **HolidayRequest Model** ([backend/models/HolidayRequest.js](backend/models/HolidayRequest.js))
**Purpose:** Track staff holiday/leave requests awaiting admin approval
**Key Fields:**
- `userId` - Reference to User
- `staffName` - Denormalized staff name
- `days` - Number of days requested
- `targetMonth` - Month when leave will be taken
- `date` - Request submission date
- `type` - "Regular" or "Duvet Day"
- `reason` - Why leave is needed
- `status` - "pending", "approved", or "rejected"
- `timestamps` - Auto createdAt/updatedAt

**Flow:** Staff creates → Admin reviews → Admin approves/rejects

---

### 3. **HolidayPayout Model** ([backend/models/HolidayPayout.js](backend/models/HolidayPayout.js))
**Purpose:** Track requests for holiday pay in lieu
**Key Fields:**
- `userId` - Reference to User
- `staffName` - Denormalized staff name
- `fromDate`, `toDate` - Period of leave being paid out
- `numberOfDays` - Calculated working days
- `targetMonth` - Payment period
- `payoutAmount` - Money value (optional)
- `status` - "pending", "approved", "paid", or "rejected"
- `notes` - Additional context

**Flow:** Staff requests payout → Admin approves → Admin marks as paid

---

### 4. **StaffLeave Model** ([backend/models/StaffLeave.js](backend/models/StaffLeave.js))
**Purpose:** Imported staff leave data from Excel uploads
**Key Fields:**
- `staffName` - Name from Excel import
- `email` - Contact email
- `userId` - Link to User account (if created)
- `holidayEntitlementDays` - Base allowance (default: 28)
- `serviceYears` - Years of service
- `carryOverDays` - Carried-over days
- `daysTakenSoFar` - Current usage
- `duvetDaysUsed` - Duvet days logged
- `isWorking` - Imported working status mirrored from the linked user when available
- `accountCreated` - Boolean flag
- `createdCredentials` - Stores temp password on account creation
- `timestamps` - Auto createdAt/updatedAt

**Purpose:** Admin bulk-imports staff data via Excel → Can convert to User accounts later

---

### 5. **Day Model** ([backend/models/Day.js](backend/models/Day.js))
**Purpose:** Log individual duvet day entries
**Key Fields:**
- `userId` - Reference to User
- `date` - Date duvet day was taken
- `note` - Optional reason/notes
- `timestamps` - Auto createdAt/updatedAt

**Constraint:** Max 8 duvet days per calendar year per user

**Connections:** Logged when staff uses a duvet day; admins can view duvet logs

---

## 🔐 AUTHENTICATION & MIDDLEWARE

### 1. **Auth Middleware** ([backend/middleware/auth.js](backend/middleware/auth.js))
**Purpose:** JWT-based authentication protection
**Process:**
1. Extracts "Authorization: Bearer <token>" header
2. Verifies token using `JWT_SECRET` from .env
3. Decodes and attaches user to `req.user`
4. Returns 401 if missing/invalid

**Used on:** All admin routes, protected staff routes

---

### 2. **Upload Middleware** ([backend/middleware/upload.js](backend/middleware/upload.js))
**Purpose:** Secure Excel file upload handling
**Features:**
- Memory storage (no disk writes)
- File type validation (.xlsx, .xls)
- MIME type checking
- 5 MB size limit
- Filters malicious extensions

**Used on:** `/api/staff/upload` endpoint

---

## 🔧 CONTROLLERS & BUSINESS LOGIC

### 1. **Auth Controller** ([backend/controllers/authController.js](backend/controllers/authController.js))

#### `login(email, password)`
- Finds user by email OR name
- Normalizes whitespace/casing for staff name login
- Validates bcrypt-hashed password (with fallback for plain text)
- Returns JWT token (expires in 24h) + user object
- **Endpoint:** `POST /api/auth/login`

#### `register(name, email, password, role, etc.)`
- Creates new user account
- Hashes password with bcrypt (salt: 10)
- Used during initial setup
- **Endpoint:** `POST /api/auth/register`

---

### 2. **Admin Controller** ([backend/controllers/adminController.js](backend/controllers/adminController.js))

#### `getAllStaff()`
- Fetches all staff users
- Calculates real-time metrics:
  - `remainingBalance` = entitlement + carryOver - daysTaken
  - `duvetDaysUsed` = count in current calendar year
  - `duvetRemaining` = max(0, 8 - used)
- **Endpoint:** `GET /api/admin/staff` (auth required)

#### `createStaff(name, email, password, dept, years, entitlement, carryOver)`
- Creates new staff account
- Only callable by authenticated admins
- **Endpoint:** `POST /api/admin/staff` (auth required)

#### `getHolidayRequests()`
- Fetches all pending/approved/rejected requests
- Includes staff name via populate
- **Endpoint:** `GET /api/admin/holiday-requests` (auth required)

#### `updateHolidayRequestStatus(requestId, status)`
- Changes request status: pending → approved/rejected
- Validates status enum
- When approving, updates linked User counters and mirrors balance changes to StaffLeave
- **Endpoint:** `POST /api/admin/holiday-requests/update-status` (auth required)

#### `getDuvetLogs()`
- Fetches all logged duvet days
- Populates staff names
- **Endpoint:** `GET /api/admin/duvet-logs` (auth required)

#### `clearImportedStaffLeave()`
- Deletes imported StaffLeave snapshot records
- **Endpoint:** `DELETE /api/admin/imported-staff-leave` (auth required)

#### `updateImportedStaffWorking(id, isWorking)`
- Updates the imported staff working flag and keeps linked User data in sync
- **Endpoint:** `PUT /api/admin/imported-staff/:id/working` (auth required)

#### `exportPayrollCSV()`
- Exports staff data with metrics:
  - Name
  - Monthly holiday paid days requested
  - Duvet days taken in current pay cycle
  - Year-to-date outstanding balances
- CSV format for payroll systems
- **Endpoint:** `GET /api/admin/export-csv` (auth required)

#### `createAdminPublic(name, email, password, ...)`
- Creates first admin account (no auth required initially)
- Allows multiple admins if called without auth
- **Endpoint:** `POST /api/admin/register-public`

#### `adminExists()`
- Checks if any admin accounts exist
- Returns boolean
- **Endpoint:** `GET /api/admin/exists`

#### `getImportedStaffLeave()`
- Fetches StaffLeave records from imports
- Calculates live remaining balance for each
- Prefers linked User values when the staff account has been created
- **Endpoint:** `GET /api/admin/imported-staff-leave` (auth required)

#### `createAccountsFromImportedStaff(staffIds[])`
- Bulk-creates User accounts from StaffLeave records
- Links users to staff records
- Generates temp password (e.g., "Welcome@123")
- Falls back to a generated imported email when the Excel row has no email
- Resyncs existing linked accounts so the saved password matches the temp password shown in admin
- Returns created account details
- **Endpoint:** `POST /api/admin/create-accounts-from-imported` (auth required)

---

### 3. **Staff Controller v1** ([backend/controllers/staffControllerv1.js](backend/controllers/staffControllerv1.js))

#### `uploadStaffLeaveData(file: Excel)`
- Parses Excel workbook
- Normalizes headers (removes spaces, special chars, lowercases)
- Maps columns: staffname, holidayentitlementdays, serviceyears, carryoverdays, duvetdaysused
- Upserts StaffLeave records by staffName (prevents duplicates)
- Returns insert/update counts
- **Endpoint:** `POST /api/staff/upload`

#### `getAllStaffLeaveData()`
- Fetches all StaffLeave records sorted by name
- **Endpoint:** `GET /api/staff`

---

### 4. **Staff Controller v2** ([backend/controllers/staffControlller.js](backend/controllers/staffControlller.js))

#### `getProfile()`
- Returns logged-in user with calculated metrics
- `remainingBalance` = entitlement + carryOver - daysTaken
- `duvetDaysUsed` = count in current year
- `duvetRemaining` = max(0, 8 - used)
- Includes `isWorking` from the live user profile or imported record fallback
- **Endpoint:** `GET /api/staff/profile` (auth required)

#### `logDuvetDay(date, note)`
- Creates Day record for duvet day
- Validates max 8 per calendar year
- Updates user.duvetDaysUsed cache
- Duvet days are logged immediately and do not go into the admin leave-approval queue
- **Endpoint:** `POST /api/staff/duvet-day` (auth required)

#### `createHolidayRequest(days, targetMonth, date, type, reason)`
- Creates HolidayRequest with status: "pending"
- Validates remaining balance ≥ days
- **Endpoint:** `POST /api/staff/holiday-request` (auth required)

---

## 🛣️ API ROUTES

### Auth Routes ([backend/routes/authRoutes.js](backend/routes/authRoutes.js))
```
POST   /api/auth/register        → authController.register
POST   /api/auth/login           → authController.login
```

### Admin Routes ([backend/routes/adminRoutes.js](backend/routes/adminRoutes.js))
```
GET    /api/admin/staff          → adminController.getAllStaff (auth)
POST   /api/admin/staff          → adminController.createStaff (auth)
POST   /api/admin/register       → adminController.createAdmin (auth)
POST   /api/admin/register-public → adminController.createAdminPublic
GET    /api/admin/exists         → adminController.adminExists
GET    /api/admin/holiday-requests → adminController.getHolidayRequests (auth)
POST   /api/admin/holiday-requests/update-status → adminController.updateHolidayRequestStatus (auth)
GET    /api/admin/duvet-logs     → adminController.getDuvetLogs (auth)
GET    /api/admin/export-csv     → adminController.exportPayrollCSV (auth)
GET    /api/admin/holiday-payouts → fetch all payouts (auth)
GET    /api/admin/imported-staff-leave → adminController.getImportedStaffLeave (auth)
POST   /api/admin/create-accounts-from-imported → adminController.createAccountsFromImportedStaff (auth)
DELETE /api/admin/imported-staff-leave → adminController.clearImportedStaffLeave (auth)
PUT    /api/admin/imported-staff/:id/working → adminController.updateImportedStaffWorking (auth)
```

### Staff Routes (v2) ([backend/routes/staffRoutes.js](backend/routes/staffRoutes.js))
```
GET    /api/staff/profile        → staffControlller.getProfile (auth)
POST   /api/staff/duvet-day      → staffControlller.logDuvetDay (auth)
POST   /api/staff/holiday-request → staffControlller.createHolidayRequest (auth)
GET    /api/staff/holiday-requests → fetch user's requests (auth)
POST   /api/staff/holiday-payout → create payout request (auth)
GET    /api/staff/holiday-payouts → fetch user's payouts (auth)
```

### Staff Routes (v1) ([backend/routes/staff.js](backend/routes/staff.js))
```
POST   /api/staff/upload        → staffControllerv1.uploadStaffLeaveData (upload middleware)
GET    /api/staff              → staffControllerv1.getAllStaffLeaveData
```

---

## 🎨 FRONTEND ARCHITECTURE

### Server Configuration ([backend/server.js](backend/server.js))
- Express.js app
- MongoDB connection (required MONGO_URI in .env)
- CORS enabled
- Port: 5000 (default)
- Routes mounted at:
  - `/api/auth` → authRoutes
  - `/api/staff` → staffRoutes & staff.js
  - `/api/admin` → adminRoutes

---

## 💻 FRONTEND COMPONENTS (React/Vite)

### Context & State Management

#### **AuthContext** ([frontend/attendx/src/context/AuthContext.jsx](frontend/attendx/src/context/AuthContext.jsx))
**Purpose:** Global auth state and API communication
**State:**
- `user` - Current user object (persisted in localStorage)
- `token` - JWT token (persisted in localStorage)
- `users` - All staff (admin only)
- `leaveRequests` - Holiday requests
- `duvetLogs` - Duvet day logs
- `holidayPayouts` - Holiday payout requests

**Key Methods:**
- `login(email, password)` - Authenticates user
- `logout()` - Clears auth state
- `fetchUsers()` - GET /api/admin/staff (admin)
- `fetchLeaveRequests()` - GET /api/admin/holiday-requests (admin)
- `fetchStaffLeaveRequests()` - GET /api/staff/holiday-requests (staff)
- `fetchDuvetLogs()` - GET /api/admin/duvet-logs or /api/staff/duvet-logs
- `fetchHolidayPayouts()` - GET /api/admin/holiday-payouts
- `createStaff(staffData)` - POST /api/admin/staff (admin)
- `updateLeaveStatus(requestId, status)` - Update request status
- `updatePayoutStatus(payoutId, status, amount, notes)` - Update payout status
- `requestLeave(requestData)` - POST /api/staff/holiday-request or /api/staff/duvet-day

**Auto-fetches on login** based on user role (admin vs staff)

---

#### **useAuth Hook** ([frontend/attendx/src/hooks/useAuth.js](frontend/attendx/src/hooks/useAuth.js))
**Purpose:** Easy context access throughout components
```javascript
const { user, token, login, logout, leaveRequests, ... } = useAuth();
```

---

### Pages & Components

#### 1. **Login** ([frontend/attendx/src/pages/Login.jsx](frontend/attendx/src/pages/Login.jsx))
**Purpose:** Staff login
**Features:**
- Email/name or password login
- Redirects authenticated staff to `/staff`
- Redirects admins with error
- Error handling & validation
**Flow:** 
1. User enters email/name + password
2. Submit → `useAuth().login()`
3. Success → stored in localStorage → navigate to `/staff`

---

#### 2. **AdminLogin** ([frontend/attendx/src/pages/AdminLogin.jsx](frontend/attendx/src/pages/AdminLogin.jsx))
**Purpose:** Admin authentication
**Features:**
- Email/name + password login
- Role validation (rejects non-admins)
- Link to staff login page
- Error messages
**Flow:**
1. Admin enters credentials
2. Submit → `useAuth().login()`
3. Validates role is "admin"
4. Success → navigate to `/admin`

---

#### 3. **AdminRegister** ([frontend/attendx/src/pages/AdminRegister.jsx](frontend/attendx/src/pages/AdminRegister.jsx))
**Purpose:** First admin account setup
**Features:**
- Form for name, email, password, confirm password
- Calls `POST /api/admin/register-public` (no auth required initially)
- Success → redirects to `/admin-login`
- Multi-column responsive layout
**Form Fields:**
- Full Name
- Email Address
- Password
- Confirm Password
**Endpoint:** POST /api/admin/register-public

---

#### 4. **StaffDashboard** ([frontend/attendx/src/pages/StaffDashboard.jsx](frontend/attendx/src/pages/StaffDashboard.jsx))
**Purpose:** Staff self-service dashboard
**Key Sections:**

**A. Metrics Cards:**
- Holiday Entitlement (base allowance)
- Carry Over Days (from prior year)
- Days Taken So Far (current period)
- Remaining Balance (calculated, red if negative)
- Total Working Days
- Present Days
- Leave Days (approved only)
- Duvet Days Logged (current year)
- Duvet Remaining (max 8 - logged)

**B. Leave Request Modal:**
- Select date (future dates only)
- Leave type: Regular or Duvet Day
- Number of days (disabled for Duvet Day)
- Reason/notes
- Validation: duvet limit, balance check
- Submit → `requestLeave()` method

**C. Leave Requests List:**
- Displays user's requests with status badge
- Status: pending, approved, rejected
- Shows date, type, reason

**D. Duvet Days List:**
- Displays logged duvet days
- Shows date and note
- Status: "Logged"

**Buttons:**
- "Request Leave" - Opens modal
- "Holiday Payment" - Navigate to `/staff/holiday-request`

**Data Connections:**
- Uses `useAuth()` to access profile, requests, duvet logs
- Real-time calculations of balances and limits

---

#### 5. **HolidayRequest** ([frontend/attendx/src/pages/HolidayRequest.jsx](frontend/attendx/src/pages/HolidayRequest.jsx))
**Purpose:** Staff holiday payout request form
**Features:**
- From Date & To Date selectors
- Auto-calculates working days (excludes weekends)
- Target Month selector
- Optional reason/notes
- Black & white minimal design
- Submit → POST /api/staff/holiday-payout

**Auto-calculation Logic:**
```javascript
calculateDays(start, end) {
  // Count weekdays (Mon-Fri) only
  let count = 0;
  while (startDate <= endDate) {
    const day = startDate.getDay();
    if (day !== 0 && day !== 6) count++; // Skip Sun(0) & Sat(6)
    startDate.setDate(startDate.getDate() + 1);
  }
  return count;
}
```

**Form Fields:**
- From Date (required)
- To Date (required)
- Number of Days (auto-filled, read-only)
- Target Month (required)
- Reason/Notes (optional)

**Success Flow:**
1. Form submit
2. Calculated working days
3. POST to /api/staff/holiday-payout
4. Success message
5. Redirect to /staff after 2 seconds

---

#### 6. **AdminDashboard** ([frontend/attendx/src/pages/AdminDashboard.jsx](frontend/attendx/src/pages/AdminDashboard.jsx))
**Purpose:** Central admin control panel
**Layout:** Tabbed interface with multiple views

**A. Statistics Cards:**
- Total Staff (count)
- Pending Leaves (count with pending status)
- Pending Payouts (count with pending status)
- Departments (distinct count)

**B. Tabs & Features:**

##### **Tab 1: Staff Directory**
- Search: name, department, years
- Displays staff cards with:
  - Name & Department
  - Remaining Balance
  - Overdue (if balance < 0)
  - Entitlement, Taken, Duvet Logged, Duvet Remaining
- Import Staff button → File upload
- Export CSV button → Downloads payroll data

##### **Tab 2: Leave Requests**
- Search: staff name, reason, type
- Displays all requests (staff + duvet days merged)
- Columns: Staff Name, Date, Type, Reason, Status
- Actions: Approve/Reject buttons
- Export CSV option

##### **Tab 3: Duvet Logs**
- Search: staff name, note, date
- Displays all logged duvet days from the Day model
- Columns: Staff Member, Date, Note, Created At
- Export CSV option

##### **Tab 4: Holiday Payouts**
- Search: staff name, month
- Shows payout requests with dates, amounts
- Status: pending, approved, paid, rejected
- Modal to update status + amount
- Export CSV option

##### **Tab 5: Add Staff**
- Form to manually create staff account
- Fields: name, email, password
- Role defaults to "staff"
- Entitlement: 20, CarryOver: 0

##### **Tab 6: Imported Data**
- Displays StaffLeave records from Excel uploads
- Search by staff name
- Checkboxes to select staff
- "Create Accounts" button → Bulk-creates User accounts
- Shows results: created, already exists, failed
- Displays temp password for created accounts
- Clear Imported Data button removes imported snapshot records
- Working checkbox updates the imported record and linked User when available

**Upload & Import Flow:**
1. Click "Import Staff" in Tab 1
2. Select Excel file (.xlsx/.xls)
3. Validates file type & size (5 MB max)
4. POST to /api/staff/upload
5. Shows success with stats
6. Auto-switches to Tab 5 "Imported Data"
7. Select staff from list
8. Click "Create Accounts"
9. POST to /api/admin/create-accounts-from-imported
10. Shows created credentials

---

#### 7. **App.jsx** ([frontend/attendx/src/pages/App.jsx](frontend/attendx/src/pages/App.jsx))
**Purpose:** Main routing & layout
**Features:**
- React Router setup
- Global Navbar with user profile & logout
- Protected routes by role
- Route structure:
  ```
  /                    → Login (staff)
  /admin-login         → AdminLogin
  /admin-setup         → AdminRegister
  /admin-register      → AdminRegister
  /admin/*             → AdminDashboard (admin only)
  /staff/*             → StaffDashboard (staff only)
  /staff/holiday-request → HolidayRequest (staff only)
  ```

**ProtectedRoute Component:**
- Checks `user && token`
- Validates role matches route requirement
- Redirects unauthorized users to login

**Navbar Component:**
- Shows logged-in user's avatar & name
- Displays role (admin/staff)
- Logout button
- Disappears when not logged in

---

## 🔄 COMPLETE USER FLOWS

### **FLOW 1: STAFF REGISTRATION & LOGIN**
```
1. User visits frontend
2. ↓ Navigate to / (Login page)
3. ↓ Enter email + password
4. ↓ POST /api/auth/login
5. ↓ Backend finds user, validates password
6. ↓ Returns JWT token + user object
7. ↓ Frontend stores in localStorage
8. ↓ Redirect to /staff (StaffDashboard)
9. ✓ Logged in, can request holidays
```

### **FLOW 2: ADMIN SETUP (NO ADMINS EXIST)**
```
1. User visits frontend
2. ↓ Navigate to /admin-setup (AdminRegister)
3. ↓ Fill: name, email, password
4. ↓ Click "Create Account"
5. ↓ POST /api/admin/register-public (NO AUTH)
6. ↓ Backend checks adminExists()
7. ↓ Creates User with role: "admin"
8. ↓ Returns created user
9. ↓ Frontend shows success message
10. ↓ Redirect to /admin-login
11. ↓ Admin logs in with credentials
12. ✓ Logged in, can manage staff
```

### **FLOW 3: STAFF REQUESTS HOLIDAY (REGULAR LEAVE)**
```
1. Staff logs in → /staff
2. ↓ Views StaffDashboard metrics
3. ↓ Clicks "Request Leave" button
4. ↓ Opens modal form
5. ↓ Selects date, type="Regular", days, reason
6. ↓ Frontend validates balance
7. ↓ Submit
8. ↓ POST /api/staff/holiday-request
9. ↓ Backend creates HolidayRequest with status: "pending"
10. ↓ Returns success
11. ↓ Frontend updates leaveRequests list
12. ✓ Request appears in staff's list + admin's list (pending status)
```

### **FLOW 4: STAFF LOGS DUVET DAY**
```
1. Staff logs in → /staff
2. ↓ Views duvet remaining (max 8)
3. ↓ Clicks "Request Leave" → selects "Duvet Day" type
4. ↓ Selects date, note
5. ↓ Submit
6. ↓ POST /api/staff/duvet-day
7. ↓ Backend validates count < 8 for year
8. ↓ Creates Day record
9. ↓ Updates user.duvetDaysUsed
10. ↓ Returns success
11. ↓ Frontend updates duvet logs
12. ✓ Duvet day appears in logs (immediately logged, no approval needed)
```

### **FLOW 5: ADMIN REVIEWS & APPROVES LEAVE**
```
1. Admin logs in → /admin
2. ↓ Views AdminDashboard
3. ↓ Clicks "Leave Requests" tab
4. ↓ Sees all pending requests
5. ↓ Clicks "Approve" on a request
6. ↓ POST /api/admin/holiday-requests/update-status
7. ↓ Backend updates status: "approved"
8. ↓ Returns updated request
9. ↓ Frontend updates UI
10. ✓ Request status changes to "approved"
11. ✓ Staff sees approved request in their dashboard
```

### **FLOW 6: STAFF REQUESTS HOLIDAY PAYOUT**
```
1. Staff logs in → /staff
2. ↓ Clicks "Holiday Payment" button
3. ↓ Navigates to /staff/holiday-request page
4. ↓ Selects From Date + To Date
5. ↓ Auto-calculates working days (weekdays only)
6. ↓ Selects Target Month (payment period)
7. ↓ Enters optional reason
8. ↓ Submit
9. ↓ POST /api/staff/holiday-payout
10. ↓ Backend creates HolidayPayout with status: "pending"
11. ↓ Returns success
12. ↓ Frontend shows success message
13. ↓ Redirects to /staff
14. ✓ Request appears in admin's "Holiday Payouts" tab
```

### **FLOW 7: ADMIN IMPORTS STAFF DATA FROM EXCEL**
```
1. Admin logs in → /admin
2. ↓ In "Staff Directory" tab
3. ↓ Clicks "Import Staff" button
4. ↓ File picker opens
5. ↓ Selects .xlsx file
6. ↓ Frontend validates file type/size
7. ↓ POST /api/staff/upload (multipart/form-data)
8. ↓ Backend:
   a. Parses Excel workbook
   b. Normalizes headers
   c. Maps to StaffLeave fields
   d. Upserts by staffName (no duplicates)
9. ↓ Returns stats: inserted, updated
10. ↓ Frontend shows success alert
11. ↓ Auto-switches to "Imported Data" tab
12. ✓ Imported staff list displays
```

### **FLOW 8: ADMIN BULK-CREATES STAFF ACCOUNTS**
```
1. Admin in AdminDashboard "Imported Data" tab
2. ↓ Sees imported staff from Excel
3. ↓ Checks boxes next to staff to enable
4. ↓ Clicks "Create Accounts" button
5. ↓ POST /api/admin/create-accounts-from-imported
6. ↓ Body: { staffIds: [...] }
10. ✓ Staff can now login with their email or name
   a. Finds StaffLeave record
   b. Checks if already linked to User
   c. If not, creates User account
   d. Uses temp password (e.g., "Welcome@123")
   e. Links User to StaffLeave
   f. Updates accountCreated flag
8. ↓ Returns results: created, alreadyExists, failed
9. ↓ Shows created accounts with credentials
10. ✓ Staff can now login with their email
```

### **FLOW 9: ADMIN EXPORTS PAYROLL CSV**
```
1. Admin in AdminDashboard "Staff Directory" tab
2. ↓ Clicks "Export CSV" button
3. ↓ GET /api/admin/export-csv
4. ↓ Backend fetches all staff
5. ↓ For each staff calculates:
   - Monthly holiday paid days
   - Duvet days in current pay cycle
   - Year-to-date outstanding balance
6. ↓ Formats as CSV
7. ↓ Returns as file download
8. ✓ Browser downloads: payroll_export_YYYY-MM-DD.csv
9. ✓ Can import to payroll system
```

---

## 📊 KEY CALCULATIONS & BUSINESS RULES

### Holiday Balance Calculation
```
Remaining Balance = Holiday Entitlement + Carry Over - Days Taken
Example: 28 + 3 - 10 = 21 days remaining
```

### Duvet Day Rules
- **Maximum:** 8 per calendar year (Jan 1 - Dec 31)
- **Request type:** Can be logged immediately (no approval)
- **Counting:** Aggregated from Day model by calendar year

### Working Days Calculation (Holiday Payout)
```javascript
// Exclude weekends (Saturday=6, Sunday=0)
let count = 0;
for (fromDate to toDate) {
  if (day !== 0 && day !== 6) count++;
}
```

### Request Status Workflow
```
HolidayRequest: pending → approved/rejected (admin action)
HolidayPayout:  pending → approved → paid/rejected (admin actions)
DuvetDay:       logged (immediate, no workflow)
```

---

## 🔗 FILE DEPENDENCY MAP

```
FRONTEND COMPONENTS
├── App.jsx
│   ├── AuthContext.jsx (context)
│   ├── useAuth.js (hook)
│   └── Pages:
│       ├── Login.jsx
│       ├── AdminLogin.jsx
│       ├── AdminRegister.jsx
│       ├── StaffDashboard.jsx
│       ├── AdminDashboard.jsx
│       └── HolidayRequest.jsx
│
BACKEND
├── server.js
│   ├── models/
│   │   ├── User.js
│   │   ├── HolidayRequest.js
│   │   ├── HolidayPayout.js
│   │   ├── StaffLeave.js
│   │   └── Day.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── staffController.js (v2)
│   │   └── staffControllerv1.js
│   └── routes/
│       ├── authRoutes.js
│       ├── adminRoutes.js
│       ├── staffRoutes.js (v2)
│       └── staff.js (v1 - uploads)
```

---

## 🚀 TECHNOLOGY STACK

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5.2.1
- **Database:** MongoDB (via Mongoose 9.6.2)
- **Authentication:** JWT (jsonwebtoken 9.0.3)
- **Password Hashing:** bcryptjs 3.0.3
- **File Upload:** multer 2.1.1
- **Excel Processing:** ExcelJS 4.4.0, fast-csv 5.0.7
- **Environment:** dotenv 17.4.2
- **CORS:** cors 2.8.6
- **Dev Tools:** nodemon 3.1.14

### Frontend
- **Framework:** React 19.2.6
- **Router:** react-router-dom 7.15.1
- **Build Tool:** Vite 8.0.14
- **Icons:** lucide-react 1.16.0
- **Styling:** Custom CSS

---

## ⚙️ CONFIGURATION REQUIREMENTS

### Backend (.env)
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-secret-key-here
PORT=5000
```

### Frontend (Vite env)
```
VITE_API_URL=http://localhost:5000
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **JWT Token Validation:** All admin & staff routes protected by auth middleware
2. **Password Hashing:** bcryptjs with salt=10
3. **File Upload Validation:** MIME type + extension checks, 5MB limit
4. **CORS:** Enabled for frontend origin
5. **Role-Based Access:** Routes check `req.user.role`
6. **Sensitive Data:** Created credentials stored in StaffLeave.createdCredentials

---

## 📝 SUMMARY OF CORE FEATURES

| Feature | Actors | Status Type | Approval Flow |
|---------|--------|------------|---------------|
| **Regular Holiday** | Staff → Admin | pending/approved/rejected | Manual approval |
| **Duvet Day** | Staff | logged | Immediate (no approval) |
| **Holiday Payout** | Staff → Admin | pending/approved/paid/rejected | Manual approval |
| **Staff Import** | Admin | - | Bulk import from Excel |
| **Account Creation** | Admin | - | Bulk create from imported |
| **CSV Export** | Admin | - | Payroll data export |

---

## 🎯 System Entry Points

1. **Staff User:** Visit `/` → Login → `/staff` dashboard
2. **Admin (First Time):** Visit `/admin-setup` → Create account → `/admin-login` → `/admin` dashboard
3. **Admin (Subsequent):** Visit `/admin-login` → `/admin` dashboard

---

This comprehensive analysis covers the entire holiday management system architecture, data flow, user journeys, and technical implementation. The system efficiently handles staff leave management, admin oversight, data import/export, and payment processing.