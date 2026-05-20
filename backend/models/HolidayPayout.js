const mongoose = require("mongoose");

const holidayPayoutSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  staffName: String,
  fromDate: String,
  toDate: String,
  numberOfDays: Number,
  targetMonth: String,
  payoutAmount: Number,
  status: {
    type: String,
    enum: ["pending", "approved", "paid", "rejected"],
    default: "pending"
  },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model("HolidayPayout", holidayPayoutSchema);
