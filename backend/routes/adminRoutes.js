const express = require("express");
const HolidayPayout = require("../models/HolidayPayout");

const router = express.Router();

// IMPORT CONTROLLERS
const {
  getAllStaff,
  createStaff,
  createAdmin,
  createAdminPublic,
  adminExists,
  getHolidayRequests,
  updateHolidayRequestStatus,
  getDuvetLogs,
  exportPayrollCSV,
  getImportedStaffLeave,
  createAccountsFromImportedStaff,
  clearImportedStaffLeave
} = require("../controllers/adminController");

// IMPORT AUTH MIDDLEWARE
const auth = require("../middleware/auth");

// ===============================
// ADMIN ROUTES
// ===============================

// GET ALL STAFF
router.get(
  "/staff",
  auth,
  getAllStaff
);

// CREATE STAFF
router.post(
  "/staff",
  auth,
  createStaff
);

// CREATE ADMIN (only callable by an authenticated admin)
router.post(
  "/register",
  auth,
  createAdmin
);

// PUBLIC CREATE ADMIN - only when no admin exists
router.post(
  "/register-public",
  createAdminPublic
);

// CHECK IF ADMIN EXISTS
router.get(
  "/exists",
  adminExists
);

// GET HOLIDAY REQUESTS
router.get(
  "/holiday-requests",
  auth,
  getHolidayRequests
);

// UPDATE HOLIDAY REQUEST STATUS
router.post(
  "/holiday-requests/update-status",
  auth,
  updateHolidayRequestStatus
);

// GET DUVET DAY LOGS
router.get(
  "/duvet-logs",
  auth,
  getDuvetLogs
);

// EXPORT CSV
router.get(
  "/export-csv",
  auth,
  exportPayrollCSV
);

// GET ALL HOLIDAY PAYOUTS
router.get(
  "/holiday-payouts",
  auth,
  async (req, res) => {
    try {
      const payouts = await HolidayPayout.find();
      res.status(200).json({
        success: true,
        data: payouts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// UPDATE HOLIDAY PAYOUT STATUS
router.post(
  "/holiday-payouts/update-status",
  auth,
  async (req, res) => {
    try {
      const { payoutId, status, payoutAmount, notes } = req.body;

      if (!['pending', 'approved', 'paid', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const payout = await HolidayPayout.findByIdAndUpdate(
        payoutId,
        { status, payoutAmount, notes },
        { new: true }
      );

      if (!payout) {
        return res.status(404).json({
          success: false,
          message: 'Payout not found'
        });
      }

      res.status(200).json({
        success: true,
        data: payout
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET IMPORTED STAFF LEAVE DATA
router.get(
  "/imported-staff-leave",
  auth,
  getImportedStaffLeave
);

// CREATE ACCOUNTS FROM IMPORTED STAFF
router.post(
  "/create-accounts-from-imported",
  auth,
  createAccountsFromImportedStaff
);

// CLEAR ALL IMPORTED STAFF LEAVE DATA
router.delete(
  "/imported-staff-leave",
  auth,
  clearImportedStaffLeave
);

// UPDATE IMPORTED STAFF WORKING STATUS
router.put(
  "/imported-staff/:id/working",
  auth,
  async (req, res, next) => {
    // forward to controller method
    const controller = require('../controllers/adminController');
    return controller.updateImportedStaffWorking(req, res, next);
  }
);

module.exports = router;