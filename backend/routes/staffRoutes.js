const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const DuvetDay = require("../models/Day");
const HolidayRequest = require("../models/HolidayRequest");

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

router.post("/holiday-request", auth, async (req, res) => {
  const { days, targetMonth } = req.body;

  await HolidayRequest.create({
    userId: req.user.id,
    days,
    targetMonth
  });

  res.json({
    msg: "Holiday request submitted"
  });
});

module.exports = router;