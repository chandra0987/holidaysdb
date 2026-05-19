const User = require("../models/User");
const bcrypt = require("bcryptjs");
const DuvetDay = require("../models/Day");
const HolidayRequest =
  require("../models/HolidayRequest");

const createCsvWriter =
  require("csv-writer")
  .createObjectCsvWriter;

// GET ALL STAFF
exports.getAllStaff = async (req, res) => {

  try {

    const users = await User.find();

    const updatedUsers = users.map(user => {

      const remainingBalance =
        user.holidayEntitlement +
        user.carryOver -
        user.daysTaken;

      return {
        ...user._doc,
        remainingBalance,
        duvetRemaining:
          8 - user.duvetDaysUsed
      };

    });

    res.status(200).json({
      success: true,
      data: updatedUsers
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// CREATE STAFF
exports.createStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      name,
      email,
      password,
      department,
      serviceYears,
      holidayEntitlement,
      carryOver
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
      department,
      serviceYears,
      holidayEntitlement: holidayEntitlement ?? 20,
      carryOver: carryOver ?? 0,
      daysTaken: 0,
      duvetDaysUsed: 0
    });

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET HOLIDAY REQUESTS
exports.getHolidayRequests =
  async (req, res) => {

    try {

      const requests =
        await HolidayRequest.find()
        .populate("userId", "name");

      res.status(200).json({
        success: true,
        data: requests
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

};

// GET DUVET LOGS
exports.getDuvetLogs = async (req, res) => {

  try {

    const logs = await DuvetDay.find()
      .populate("userId", "name");

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// EXPORT CSV
exports.exportPayrollCSV =
  async (req, res) => {

    try {

      const users = await User.find();

      const records = users.map(user => {

        const remainingBalance =
          user.holidayEntitlement +
          user.carryOver -
          user.daysTaken;

        return {
          name: user.name,
          holidayBalance:
            remainingBalance,
          duvetDaysUsed:
            user.duvetDaysUsed
        };

      });

      const csvWriter =
        createCsvWriter({
          path: "payroll.csv",
          header: [
            {
              id: "name",
              title: "NAME"
            },
            {
              id: "holidayBalance",
              title: "HOLIDAY_BALANCE"
            },
            {
              id: "duvetDaysUsed",
              title: "DUVET_DAYS_USED"
            }
          ]
        });

      await csvWriter.writeRecords(
        records
      );

      res.download("payroll.csv");

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

};