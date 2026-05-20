const mongoose = require("mongoose");

const holidayRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  staffName: String,
  days: Number,
  targetMonth: String,
  date: String,
  type: {
    type: String,
    enum: ["Regular", "Duvet Day"],
    default: "Regular"
  },
  reason: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("HolidayRequest", holidayRequestSchema);