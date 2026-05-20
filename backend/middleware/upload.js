const multer = require('multer');
const path = require('path');

// Store file in memory so we can parse it without saving to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream', // generic binary — validate by extension below
  ];
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  // Extension is the primary check; MIME type as secondary guard
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

module.exports = upload;
