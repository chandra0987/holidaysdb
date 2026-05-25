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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const makeImportedEmail = (staffLeave) => {
  const existingEmail = String(staffLeave?.email || '').trim();
  if (existingEmail) {
    return existingEmail;
  }

  const namePart = String(staffLeave?.staffName || 'staff')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'staff';
  const idPart = String(staffLeave?._id || Date.now()).slice(-6);
  return `${namePart}.${idPart}@imported.local`;
};

// GET ALL STAFF
exports.getAllStaff = async (req, res) => {

  try {

    const users = await User.find();

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const updatedUsers = await Promise.all(users.map(async (user) => {
      const holidayEntitlement = toNumber(user.holidayEntitlement, 0);
      const carryOver = toNumber(user.carryOver, 0);
      const daysTaken = toNumber(user.daysTaken, 0);
      const remainingBalance = holidayEntitlement + carryOver - daysTaken;
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

// DELETE STAFF BY ID
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Staff member deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const request = await HolidayRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const previousStatus = request.status;

    const updatedRequest = await HolidayRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );

    if (previousStatus !== 'approved' && status === 'approved' && request.userId) {
      const user = await User.findById(request.userId);

      if (user) {
        const linkedStaffLeave = await StaffLeave.findOne({ userId: user._id });

        if (request.type === 'Duvet Day') {
          const duvetDate = request.date ? new Date(request.date) : new Date();
          const existingDuvetDay = await DuvetDay.findOne({
            userId: user._id,
            date: duvetDate,
            note: request.reason || ''
          });

          if (!existingDuvetDay) {
            await DuvetDay.create({
              userId: user._id,
              date: duvetDate,
              note: request.reason || ''
            });
          }

          user.duvetDaysUsed = toNumber(user.duvetDaysUsed, 0) + 1;

          if (linkedStaffLeave) {
            linkedStaffLeave.duvetDaysUsed = toNumber(linkedStaffLeave.duvetDaysUsed, 0) + 1;
            await linkedStaffLeave.save();
          }
        } else {
          const approvedDays = toNumber(request.days, 1);
          user.daysTaken = toNumber(user.daysTaken, 0) + approvedDays;

          if (linkedStaffLeave) {
            linkedStaffLeave.daysTakenSoFar = toNumber(linkedStaffLeave.daysTakenSoFar, 0) + approvedDays;
            await linkedStaffLeave.save();
          }
        }

        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      data: updatedRequest
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
    const staffLeaveData = await StaffLeave.find().populate('userId', 'email name department serviceYears holidayEntitlement carryOver daysTaken duvetDaysUsed isWorking');
    
    // Calculate remaining balance for each staff
    const staffWithMetrics = staffLeaveData.map(staff => {
      const linkedUser = staff.userId || null;
      const holidayEntitlementDays = toNumber(linkedUser?.holidayEntitlement ?? staff.holidayEntitlementDays, 28);
      const carryOverDays = toNumber(linkedUser?.carryOver ?? staff.carryOverDays, 0);
      const daysTakenSoFar = toNumber(linkedUser?.daysTaken ?? staff.daysTakenSoFar, 0);
      const duvetDaysUsed = toNumber(linkedUser?.duvetDaysUsed ?? staff.duvetDaysUsed, 0);
      const serviceYears = toNumber(linkedUser?.serviceYears ?? staff.serviceYears, 0);
      const isWorking = typeof linkedUser?.isWorking !== 'undefined' ? linkedUser.isWorking : (typeof staff.isWorking !== 'undefined' ? staff.isWorking : true);

      return {
        ...staff._doc,
        staffName: linkedUser?.name || staff.staffName,
        email: linkedUser?.email || staff.email,
        department: linkedUser?.department || staff.department,
        accountCreated: Boolean(staff.accountCreated || linkedUser),
        holidayEntitlementDays,
        carryOverDays,
        daysTakenSoFar,
        duvetDaysUsed,
        serviceYears,
        remainingBalance: holidayEntitlementDays + carryOverDays - daysTakenSoFar,
        isWorking
      };
    });
    
    res.status(200).json({ success: true, data: staffWithMetrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE imported staff working status
exports.updateImportedStaffWorking = async (req, res) => {
  try {
    const { id } = req.params;
    const { isWorking } = req.body;

    if (typeof isWorking !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isWorking must be boolean' });
    }

    const staffLeave = await StaffLeave.findById(id);
    if (!staffLeave) {
      return res.status(404).json({ success: false, message: 'Imported staff record not found' });
    }

    staffLeave.isWorking = isWorking;
    await staffLeave.save();

    // If linked to a User account, keep parity
    if (staffLeave.userId) {
      const user = await User.findById(staffLeave.userId);
      if (user) {
        user.isWorking = isWorking;
        await user.save();
      }
    }

    // Return updated normalized record similar to getImportedStaffLeave mapping
    const linkedUser = staffLeave.userId ? await User.findById(staffLeave.userId) : null;
    const holidayEntitlementDays = toNumber(linkedUser?.holidayEntitlement ?? staffLeave.holidayEntitlementDays, 28);
    const carryOverDays = toNumber(linkedUser?.carryOver ?? staffLeave.carryOverDays, 0);
    const daysTakenSoFar = toNumber(linkedUser?.daysTaken ?? staffLeave.daysTakenSoFar, 0);
    const duvetDaysUsed = toNumber(linkedUser?.duvetDaysUsed ?? staffLeave.duvetDaysUsed, 0);
    const serviceYears = toNumber(linkedUser?.serviceYears ?? staffLeave.serviceYears, 0);

    const payload = {
      ...staffLeave._doc,
      staffName: linkedUser?.name || staffLeave.staffName,
      email: linkedUser?.email || staffLeave.email,
      department: linkedUser?.department || staffLeave.department,
      accountCreated: Boolean(staffLeave.accountCreated || linkedUser),
      holidayEntitlementDays,
      carryOverDays,
      daysTakenSoFar,
      duvetDaysUsed,
      serviceYears,
      remainingBalance: holidayEntitlementDays + carryOverDays - daysTakenSoFar,
      isWorking: typeof linkedUser?.isWorking !== 'undefined' ? linkedUser.isWorking : staffLeave.isWorking
    };

    res.status(200).json({ success: true, data: payload });
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
          const linkedUser = await User.findById(staffLeave.userId);
          if (linkedUser) {
            linkedUser.password = hashedPassword;
            await linkedUser.save();

            staffLeave.createdCredentials = {
              email: linkedUser.email || staffLeave.email || makeImportedEmail(staffLeave),
              password: tempPassword,
              createdAt: new Date()
            };
            await staffLeave.save();
          }

          results.alreadyExists++;
          continue;
        }

        // Find existing user by email or name
        let existingUser = null;
        const trimmedEmail = String(staffLeave.email || '').trim();
        const trimmedName = String(staffLeave.staffName || '').trim();

        if (trimmedEmail) {
          existingUser = await User.findOne({ email: trimmedEmail });
        }
        if (!existingUser && trimmedName) {
          existingUser = await User.findOne({ name: new RegExp(`^\\s*${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*$`, 'i') });
        }

        if (existingUser) {
          // Link existing user to staff leave record
          existingUser.password = hashedPassword;
          await existingUser.save();

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
          name: trimmedName || staffLeave.staffName,
          email: makeImportedEmail(staffLeave),
          password: hashedPassword,
          role: 'staff',
          department: '',
          serviceYears: toNumber(staffLeave.serviceYears, 0),
          holidayEntitlement: toNumber(staffLeave.holidayEntitlementDays, 28),
          carryOver: toNumber(staffLeave.carryOverDays, 0),
          daysTaken: toNumber(staffLeave.daysTakenSoFar, 0),
          duvetDaysUsed: toNumber(staffLeave.duvetDaysUsed, 0),
          isWorking: typeof staffLeave.isWorking !== 'undefined' ? Boolean(staffLeave.isWorking) : true
        });

        // Link the created user to staff leave record
        staffLeave.userId = newUser._id;
        staffLeave.accountCreated = true;
        staffLeave.createdCredentials = {
          email: newUser.email || makeImportedEmail(staffLeave),
          password: tempPassword,
          createdAt: new Date()
        };
        await staffLeave.save();

        results.createdAccounts.push({
          name: staffLeave.staffName,
          email: newUser.email || makeImportedEmail(staffLeave),
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

// CLEAR ALL IMPORTED STAFF LEAVE DATA
exports.clearImportedStaffLeave = async (req, res) => {
  try {
    const result = await StaffLeave.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'Imported staff data cleared',
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};