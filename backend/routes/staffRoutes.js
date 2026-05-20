const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const DuvetDay = require("../models/Day");
const HolidayRequest = require("../models/HolidayRequest");
const HolidayPayout = require("../models/HolidayPayout");
const { createHolidayRequest } = require("../controllers/staffControlller");

router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  const remainingBalance =
    user.holidayEntitlement +
    user.carryOver -
    user.daysTaken;

  res.json({
    ...user._doc,
    remainingBalance,
    duvetRemaining: 8 - user.duvetDaysUsed
  });
});

router.post("/duvet-day", auth, async (req, res) => {
  const { date, note } = req.body;

  const user = await User.findById(req.user.id);

  if (user.duvetDaysUsed >= 8) {
    return res.status(400).json({
      msg: "Limit reached"
    });
  }

  await DuvetDay.create({
    userId: user._id,
    date,
    note
  });

  user.duvetDaysUsed += 1;
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
      staffName: user.name,
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