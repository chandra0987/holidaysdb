const mongoose = require('mongoose');

const staffLeaveSchema = new mongoose.Schema(
  {
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    holidayEntitlementDays: {
      type: Number,
      default: 28,
    },
    serviceYears: {
      type: Number,
      default: 0,
    },
    carryOverDays: {
      type: Number,
      default: 0,
    },
    daysTakenSoFar: {
      type: Number,
      default: 0,
    },
    duvetDaysUsed: {
      type: Number,
      default: 0,
    },
    accountCreated: {
      type: Boolean,
      default: false,
    },
    createdCredentials: {
      email: {
        type: String,
        trim: true,
        default: ''
      },
      password: {
        type: String,
        trim: true,
        default: ''
      },
      createdAt: {
        type: Date,
        default: null
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffLeave', staffLeaveSchema);
