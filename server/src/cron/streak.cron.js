const cron = require('node-cron');
const User = require('../models/User.model');

const runStreakCron = () => {
  // Runs at 00:00 every day
  cron.schedule('0 0 * * *', async () => {
    console.log('[MindOrb] Midnight cron — processing streaks');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    try {
      // ── 1. Reward active users ───────────────────────────────────
      const activeUsers = await User.find({
        lastSessionDate: { $gte: yesterdayStart, $lt: todayStart },
      });

      if (activeUsers.length) {
        const bulkOps = activeUsers.map(user => {
          const newStreak = (user.streak || 0) + 1;
          return {
            updateOne: {
              filter: { _id: user._id },
              update: {
                $set: {
                  streak: newStreak,
                  longestStreak: Math.max(newStreak, user.longestStreak || 0),
                },
              },
            },
          };
        });
        await User.bulkWrite(bulkOps);
      }
      console.log(`[MindOrb] Streak incremented for ${activeUsers.length} user(s)`);

      // ── 2. Reset lapsed users ────────────────────────────────────
      const lapsedResult = await User.updateMany(
        {
          streak: { $gt: 0 },
          lastSessionDate: { $ne: null, $lt: yesterdayStart },
        },
        { $set: { streak: 0 } }
      );
      console.log(`[MindOrb] Streak reset for ${lapsedResult.modifiedCount} lapsed user(s)`);
    } catch (err) {
      console.error('[MindOrb] Streak cron error:', err);
    }
  });
};

module.exports = runStreakCron;