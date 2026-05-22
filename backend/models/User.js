const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["staff", "admin"],
    default: "staff"
  },
  department: String,
  serviceYears: Number,

  holidayEntitlement: Number,
  carryOver: Number,
  daysTaken: {
    type: Number,
    default: 0
  },

  duvetDaysUsed: {
    type: Number,
    default: 0
  }
  ,
  isWorking: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("User", userSchema);