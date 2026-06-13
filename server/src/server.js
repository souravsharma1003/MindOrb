require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const runStreakCron=require("./cron/streak.cron");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT,"0.0.0.0", () => {
    runStreakCron();
    console.log(`Server running on port ${PORT}`);
  });
});