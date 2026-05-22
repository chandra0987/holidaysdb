const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const DuvetDay = require("../models/Day");
const HolidayRequest = require("../models/HolidayRequest");
const HolidayPayout = require("../models/HolidayPayout");
const StaffLeave = require("../models/StaffLeave");
const { createHolidayRequest } = require("../controllers/staffControlller");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const importedStaff = await StaffLeave.findOne({
    $or: [
      { userId: user?._id },
      { email: user?.email },
      { staffName: user?.name }
    ]
  });

  const holidayEntitlement = toNumber(user?.holidayEntitlement, toNumber(importedStaff?.holidayEntitlementDays, 28));
  const carryOver = toNumber(user?.carryOver, toNumber(importedStaff?.carryOverDays, 0));
  const daysTaken = toNumber(user?.daysTaken, toNumber(importedStaff?.daysTakenSoFar, 0));
  const remainingBalance = holidayEntitlement + carryOver - daysTaken;

  // compute duvet days used in current calendar year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const usedThisYear = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });

  res.json({
    ...user._doc,
    holidayEntitlement,
    carryOver,
    daysTaken,
    remainingBalance,
    duvetDaysUsed: usedThisYear,
    duvetRemaining: Math.max(0, 8 - usedThisYear),
    isWorking: typeof user?.isWorking !== 'undefined' ? user.isWorking : (importedStaff?.isWorking ?? true)
  });

});

router.post("/duvet-day", auth, async (req, res) => {
  const { date, note } = req.body;

  const user = await User.findById(req.user.id);

  // count duvet days in current calendar year
  const dt = date ? new Date(date) : new Date();
  const year = dt.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const usedThisYear = await DuvetDay.countDocuments({ userId: user._id, date: { $gte: startOfYear, $lte: endOfYear } });

  if (usedThisYear >= 8) {
    return res.status(400).json({ msg: "Limit reached" });
  }

  await DuvetDay.create({ userId: user._id, date, note });

  // keep user.duvetDaysUsed in sync for compatibility (store latest count)
  user.duvetDaysUsed = usedThisYear + 1;
  await user.save();

  res.json({ msg: "Duvet day logged" });
});

router.post("/holiday-request", auth, createHolidayRequest);

// GET holiday requests for current staff user
router.get("/holiday-requests", auth, async (req, res) => {
  try {
    const requests = await HolidayRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/holiday-payout", auth, async (req, res) => {
  try {
    const { fromDate, toDate, numberOfDays, targetMonth, reason } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const payout = await HolidayPayout.create({
      userId: user._id,
      staffName: user.name || user.email || 'Unknown',
      fromDate,
      toDate,
      numberOfDays,
      targetMonth,
      notes: reason || '',
      status: "pending"
    });

    res.status(201).json({
      success: true,
      message: "Holiday payout request submitted",
      data: payout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/holiday-payouts", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const payouts = await HolidayPayout.find({ userId: user._id });

    res.status(200).json({
      success: true,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET duvet logs for current staff user
router.get("/duvet-logs", auth, async (req, res) => {
  try {
    const logs = await DuvetDay.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;