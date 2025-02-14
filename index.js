const bot = require("./bot");

// Export the bot for Vercel
module.exports = async (req, res) => {
  if (req.method === "POST") {
    // Use Telegraf's webhookCallback to handle updates
    await bot.webhookCallback(req, res);
  } else {
    res.status(200).json({ status: "ok", message: "Server is running, thanks Vercel (2am)" });
  }
};
