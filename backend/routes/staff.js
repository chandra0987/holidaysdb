const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadStaffLeaveData, getAllStaffLeaveData } = require('../controllers/staffControllerv1');

// POST /api/staff/upload  — accepts a single Excel file in form field "file"
router.post(
  '/upload',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Multer validation error (wrong file type, size exceeded, etc.)
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadStaffLeaveData
);

// GET /api/staff  — retrieve all stored staff leave records
router.get('/', getAllStaffLeaveData);

module.exports = router;
