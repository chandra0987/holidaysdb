const mongoose = require('mongoose');

const staffLeaveSchema = new mongoose.Schema(
  {
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    holidayEntitlementDays: {
      type: Number,
      default: 0,
    },
    serviceYears: {
      type: Number,
      default: 0, 
      // Consider adding validation to ensure this is a non-negative integer
    },
    carryOverDays: {
      type: Number,
      default: 0,
    },
    duvetDaysUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffLeave', staffLeaveSchema);
