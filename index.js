const { Telegraf } = require("telegraf");

// Fetch the token from the environment variable
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  throw new Error("No TOKEN environment variable found. Please set the TOKEN variable.");
}

// Initialize the bot
const bot = new Telegraf(TOKEN);

// Command handler for /start
bot.start((ctx) => {
  console.log("Received /start command");
  ctx.reply("Hello! Use /gold to get today's gold price table in Bangalore.");
});

// Command handler for /gold
bot.command("gold", (ctx) => {
  console.log("Received /gold command");
  ctx.reply("Fetching gold prices...");
});

// Export the bot for Vercel
module.exports = async (req, res) => {
  if (req.method === "POST") {
    console.log("Received webhook update");
    try {
      // Use Telegraf's webhookCallback to handle updates
      await bot.webhookCallback(req, res);
      console.log("Webhook update processed successfully");
    } catch (error) {
      console.error("Error handling update:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  } else {
    console.log("Received GET request");
    res.status(200).json({ status: "ok", message: "Server is running" });
  }
};
