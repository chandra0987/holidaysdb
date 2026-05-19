const mongoose = require("mongoose");

const holidayRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  days: Number,
  targetMonth: String
}, { timestamps: true });

module.exports = mongoose.model("HolidayRequest", holidayRequestSchema);