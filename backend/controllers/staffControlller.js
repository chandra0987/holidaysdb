const User = require("../models/User");
const DuvetDay = require("../models/Day");
const HolidayRequest = require("../models/HolidayRequest");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const getBalanceData = (user) => {
  const holidayEntitlement = toNumber(user?.holidayEntitlement, 0);
  const carryOver = toNumber(user?.carryOver, 0);
  const daysTaken = toNumber(user?.daysTaken, 0);

  return {
    remainingBalance: holidayEntitlement + carryOver - daysTaken
  };
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const { remainingBalance } = getBalanceData(user);

    // compute duvet days used in current year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const duvetDaysUsed = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });

    res.status(200).json({
      success: true,
      user,
      remainingBalance,
      duvetDaysUsed,
      duvetRemaining: Math.max(0, 8 - duvetDaysUsed)
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


exports.logDuvetDay = async (req, res) => {
  try {

    const { date, note } = req.body;

    const user = await User.findById(
      req.user.id
    );

    
    // compute duvet days in the target calendar year
    const dt = date ? new Date(date) : new Date();
    const year = dt.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    const usedThisYear = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });

    if (usedThisYear >= 8) {
      return res.status(400).json({
        success: false,
        message: "Maximum duvet days reached"
      });
    }

    // SAVE DUVET DAY
    await DuvetDay.create({ userId: user._id, date, note });

    // update cached count on user for compatibility
    user.duvetDaysUsed = usedThisYear + 1;
    await user.save();

    res.status(200).json({ success: true, message: "Duvet day added" });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// HOLIDAY PAYMENT REQUEST
exports.createHolidayRequest =
  async (req, res) => {

    try {

      const { days, targetMonth, date, type, reason } =
        req.body;

      const user = await User.findById(req.user.id);
      const { remainingBalance } = getBalanceData(user);

      if (type !== 'Duvet Day' && days > remainingBalance) {
        return res.status(400).json({
          success: false,
          message: "Insufficient holiday balance"
        });
      }

      const requestedType = type || 'Regular';

      await HolidayRequest.create({
        userId: user._id,
        staffName: user.name || user.email || 'Unknown',
        days,
        targetMonth,
        date: date || new Date().toISOString().split('T')[0],
        type: requestedType,
        reason: reason || '',
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message:
          "Holiday request submitted"
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

};