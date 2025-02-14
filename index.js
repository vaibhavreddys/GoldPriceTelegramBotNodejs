const bot = require("./bot");

module.exports = async (req, res) => {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body, res);
  } else {
    res.status(200).json({ status: "ok", message: "Server is running, thanks Vercel, ILY." });
  }
};
