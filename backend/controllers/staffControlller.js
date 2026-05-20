

exports.getProfile = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    const remainingBalance =
      user.holidayEntitlement +
      user.carryOver -
      user.daysTaken;

    const duvetRemaining =
      8 - user.duvetDaysUsed;

    res.status(200).json({
      success: true,
      user,
      remainingBalance,
      duvetRemaining
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

    
    if (user.duvetDaysUsed >= 8) {
      return res.status(400).json({
        
        success: false,
        message: "Maximum duvet days reached"
      });
    }

    // SAVE DUVET DAY
    await DuvetDay.create({
      userId: user._id,
      date,
      note
    });

    // UPDATE COUNT
    user.duvetDaysUsed += 1;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Duvet day added"
    });

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

      const { days, targetMonth } =
        req.body;

      const user = await User.findById(
        req.user.id
      );

      const remainingBalance =
        user.holidayEntitlement +
        user.carryOver -
        user.daysTaken;

      // VALIDATION
      if (days > remainingBalance) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient holiday balance"
        });
      }

      await HolidayRequest.create({
        userId: user._id,
        days,
        targetMonth
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