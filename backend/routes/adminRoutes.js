const express = require("express");

const router = express.Router();

// IMPORT CONTROLLERS
const {
  getAllStaff,
  createStaff,
  getHolidayRequests,
  getDuvetLogs,
  exportPayrollCSV
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

// GET HOLIDAY REQUESTS
router.get(
  "/holiday-requests",
  auth,
  getHolidayRequests
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

module.exports = router;