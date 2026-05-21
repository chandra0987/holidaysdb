const User = require("../models/User");
const bcrypt = require("bcryptjs");
const DuvetDay = require("../models/Day");
const HolidayRequest =
  require("../models/HolidayRequest");
const StaffLeave = require("../models/StaffLeave");

const escapeCsvValue = (value) => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

// GET ALL STAFF
exports.getAllStaff = async (req, res) => {

  try {

    const users = await User.find();

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const updatedUsers = await Promise.all(users.map(async (user) => {
      const remainingBalance = user.holidayEntitlement + user.carryOver - user.daysTaken;
      const usedThisYear = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });
      return {
        ...user._doc,
        remainingBalance,
        duvetDaysUsed: usedThisYear,
        duvetRemaining: Math.max(0, 8 - usedThisYear)
      };
    }));

    res.status(200).json({ success: true, data: updatedUsers });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// CREATE STAFF
exports.createStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      name,
      email,
      password,
      department,
      serviceYears,
      holidayEntitlement,
      carryOver
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
      department,
      serviceYears,
      holidayEntitlement: holidayEntitlement ?? 20,
      carryOver: carryOver ?? 0,
      daysTaken: 0,
      duvetDaysUsed: 0
    });

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET HOLIDAY REQUESTS
exports.getHolidayRequests =
  async (req, res) => {

    try {

      const requests =
        await HolidayRequest.find()
        .populate("userId", "name");

      res.status(200).json({
        success: true,
        data: requests
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

};

// UPDATE HOLIDAY REQUEST STATUS
exports.updateHolidayRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const request = await HolidayRequest.findByIdAndUpdate(
      requestId,
      { status },
      { returnDocument: 'after' }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET DUVET LOGS
exports.getDuvetLogs = async (req, res) => {

  try {

    const logs = await DuvetDay.find()
      .populate("userId", "name");

    const normalizedLogs = logs.map((log) => ({
      ...log._doc,
      staffName: log.userId?.name || log.staffName || "Unknown"
    }));

    res.status(200).json({
      success: true,
      data: normalizedLogs
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// EXPORT CSV
exports.exportPayrollCSV =
  async (req, res) => {

    try {

      const users = await User.find({ role: "staff" });

      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      const records = await Promise.all(users.map(async (user) => {
        const remainingBalance = (user.holidayEntitlement || 0) + (user.carryOver || 0) - (user.daysTaken || 0);
        const usedThisYear = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });
        return {
          name: user.name,
          monthlyHolidayPaidDaysRequested: user.daysTaken,
          duvetDaysTakenInCurrentPayCycle: usedThisYear,
          yearToDateOutstandingBalances: remainingBalance
        };
      }));

      const csvLines = [
        [
          "Name",
          "Monthly Holiday Paid Days Requested",
          "Duvet Days taken in current pay cycle",
          "Year-to-date outstanding balances"
        ].map(escapeCsvValue).join(",")
      ];

      records.forEach((record) => {
        csvLines.push([
          record.name,
          record.monthlyHolidayPaidDaysRequested,
          record.duvetDaysTakenInCurrentPayCycle,
          record.yearToDateOutstandingBalances
        ].map(escapeCsvValue).join(","));
      });

      const fileName = `payroll_export_${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
      res.status(200).send(csvLines.join("\n"));

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

};

// CREATE ADMIN (only callable by existing admin users)
exports.createAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      name,
      email,
      password,
      department,
      serviceYears,
      holidayEntitlement,
      carryOver
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      department,
      serviceYears,
      holidayEntitlement: holidayEntitlement ?? 20,
      carryOver: carryOver ?? 0,
      daysTaken: 0,
      duvetDaysUsed: 0
    });

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUBLIC CREATE ADMIN - allows creating multiple admin accounts
exports.createAdminPublic = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      serviceYears,
      holidayEntitlement,
      carryOver
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      department,
      serviceYears,
      holidayEntitlement: holidayEntitlement ?? 20,
      carryOver: carryOver ?? 0,
      daysTaken: 0,
      duvetDaysUsed: 0
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CHECK IF ANY ADMIN EXISTS
exports.adminExists = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    res.status(200).json({ success: true, exists: count > 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL STAFF LEAVE DATA (IMPORTED STAFF) WITH CALCULATED METRICS
exports.getImportedStaffLeave = async (req, res) => {
  try {
    const staffLeaveData = await StaffLeave.find().populate('userId', 'email name department');
    
    // Calculate remaining balance for each staff
    const staffWithMetrics = staffLeaveData.map(staff => ({
      ...staff._doc,
      remainingBalance: (staff.holidayEntitlementDays || 28) + (staff.carryOverDays || 0) - (staff.daysTakenSoFar || 0)
    }));
    
    res.status(200).json({ success: true, data: staffWithMetrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE ACCOUNTS FOR IMPORTED STAFF
exports.createAccountsFromImportedStaff = async (req, res) => {
  try {
    const { staffIds } = req.body;

    if (!staffIds || !Array.isArray(staffIds)) {
      return res.status(400).json({
        success: false,
        message: 'staffIds must be an array'
      });
    }

    // Generate a single password for all staff
    const tempPassword = 'Welcome@123'; // You can customize this or generate dynamically
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const results = {
      created: 0,
      failed: 0,
      alreadyExists: 0,
      errors: [],
      createdAccounts: [],
      tempPassword: tempPassword // Return the password to display
    };

    for (const staffId of staffIds) {
      try {
        const staffLeave = await StaffLeave.findById(staffId);

        if (!staffLeave) {
          results.failed++;
          results.errors.push({ staffId, error: 'Staff leave record not found' });
          continue;
        }

        // Check if account already created
        if (staffLeave.accountCreated && staffLeave.userId) {
          results.alreadyExists++;
          continue;
        }

        // Find existing user by email or name
        let existingUser = null;
        if (staffLeave.email) {
          existingUser = await User.findOne({ email: staffLeave.email });
        }
        if (!existingUser && staffLeave.staffName) {
          existingUser = await User.findOne({ name: staffLeave.staffName });
        }

        if (existingUser) {
          // Link existing user to staff leave record
          staffLeave.userId = existingUser._id;
          staffLeave.accountCreated = true;
          staffLeave.createdCredentials = {
            email: existingUser.email || staffLeave.email || '',
            password: tempPassword,
            createdAt: new Date()
          };
          await staffLeave.save();
          results.alreadyExists++;
          continue;
        }

        // Create new user account with the same password
        const newUser = await User.create({
          name: staffLeave.staffName,
          email: staffLeave.email || '',
          password: hashedPassword,
          role: 'staff',
          department: '',
          serviceYears: staffLeave.serviceYears || 0,
          holidayEntitlement: staffLeave.holidayEntitlementDays || 28,
          carryOver: staffLeave.carryOverDays || 0,
          daysTaken: staffLeave.daysTakenSoFar || 0,
          duvetDaysUsed: staffLeave.duvetDaysUsed || 0
        });

        // Link the created user to staff leave record
        staffLeave.userId = newUser._id;
        staffLeave.accountCreated = true;
        staffLeave.createdCredentials = {
          email: newUser.email || '',
          password: tempPassword,
          createdAt: new Date()
        };
        await staffLeave.save();

        results.createdAccounts.push({
          name: staffLeave.staffName,
          email: staffLeave.email || '',
          password: tempPassword
        });
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({ staffId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Account creation process completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};