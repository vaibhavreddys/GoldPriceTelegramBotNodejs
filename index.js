// index.js
const bot = require("./bot");

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ status: "ok" });
    }
  } catch (err) {
    console.error("Error handling request:", err);
    res.status(500).end();
  }
};
