const mongoose = require("mongoose");

const DaySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  date: Date,
  note: String
}, { timestamps: true });

module.exports = mongoose.model("Day", DaySchema);