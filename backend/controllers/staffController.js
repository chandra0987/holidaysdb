const ExcelJS = require('exceljs');
const StaffLeave = require('../models/StaffLeave');

// Helper: normalize a header string — strip all non-alphanumeric chars, lowercase
const normalizeHeader = (header) => {
  if (!header) return '';
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // removes spaces, brackets, special chars
};

// POST /api/staff/upload
const uploadStaffLeaveData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Parse Excel from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(422).json({ success: false, message: 'Excel file has no worksheets.' });
    }

    // Read header row (row 1)
    const headerRow = worksheet.getRow(1);
    const headers = [];
    
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const normalized = normalizeHeader(cell.value);
      headers[colNumber - 1] = normalized; // Store at correct index
      console.log(`Header Col ${colNumber}: Raw="${cell.value}", Normalized="${normalized}"`);
    });

    console.log('All Headers:', headers);

    // Expected column keys after normalization
    const FIELD_MAP = {
      staffname: 'staffName',
      holidayentitlementdays: 'holidayEntitlementDays',
      serviceyears: 'serviceYears',
      carryoverdays: 'carryOverDays',
      duvetdaysused: 'duvetDaysUsed',
    };

    console.log('Field Map:', FIELD_MAP);

    const records = [];
    let totalRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      
      totalRows++;
      const record = {};
      let hasData = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const rawHeader = headers[colNumber - 1];
        const key = FIELD_MAP[rawHeader];
        
        console.log(`Row ${rowNumber}, Col ${colNumber}: Header="${rawHeader}", Key="${key}", Value="${cell.value}"`);
        
        if (key) {
          const value = cell.value !== null && cell.value !== undefined ? cell.value : null;
          record[key] = value;
          
          if (value !== null && value !== '') {
            hasData = true;
          }
        }
      });

      console.log(`Row ${rowNumber} Record:`, record);

      // Only save rows that have a staff name
      if (record.staffName && record.staffName.toString().trim() !== '') {
        records.push(record);
      } else {
        console.log(`Row ${rowNumber} skipped: No valid staffName`);
      }
    });

    console.log(`Total rows processed: ${totalRows}, Valid records: ${records.length}`);

    if (records.length === 0) {
      return res.status(422).json({ 
        success: false, 
        message: 'No valid data rows found in the file.',
        debug: {
          totalRows,
          headers,
          fieldMap: FIELD_MAP
        }
      });
    }

    // Upsert each record by staffName to avoid duplicates on re-upload
    const ops = records.map((r) => ({
      updateOne: {
        filter: { staffName: r.staffName },
        update: { $set: r },
        upsert: true,
      },
    }));

    const result = await StaffLeave.bulkWrite(ops);

    return res.status(200).json({
      success: true,
      message: `File processed successfully. ${records.length} record(s) saved/updated.`,
      stats: {
        totalRows: records.length,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        matched: result.matchedCount,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error.', 
      error: err.message 
    });
  }
};

// GET /api/staff — retrieve all stored records
const getAllStaffLeaveData = async (req, res) => {
  try {
    const data = await StaffLeave.find().sort({ staffName: 1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error.', 
      error: err.message 
    });
  }
};

module.exports = { uploadStaffLeaveData, getAllStaffLeaveData };