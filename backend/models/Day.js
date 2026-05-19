const mongoose = require("mongoose");

const DaySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  date: Date,
  note: String
}, { timestamps: true });

module.exports = mongoose.model("Day", DaySchema);