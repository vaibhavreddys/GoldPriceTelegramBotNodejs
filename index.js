const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

// Fetch the token from the environment variable
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  throw new Error("No TOKEN environment variable found. Please set the TOKEN variable.");
}

// Initialize the bot
const bot = new Telegraf(TOKEN);

// Function to scrape the gold price table
async function getGoldPrices() {
  const url = "https://www.goodreturns.in/gold-rates/bangalore.html";

  try {
    // Use cloudscraper to bypass Cloudflare
    const html = await cloudscraper.get(url);

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Locate the section containing the table
    const section = $('section[data-gr-title="Today 22 Carat Gold Price Per Gram in Bangalore (INR)"]');
    if (!section.length) {
      return "Sorry, I couldn't find the gold price table, try again!";
    }

    // Locate the table within the section
    const table = section.find("table.table-conatiner");
    if (!table.length) {
      return "Sorry, I couldn't find the gold price information, try again!";
    }

    // Extract table headers
    const headers = [];
    table.find("thead th").each((i, el) => {
      headers.push($(el).text().trim());
    });

    // Extract table rows
    const rows = [];
    table.find("tbody tr").each((i, row) => {
      const cells = [];
      $(row).find("td").each((j, cell) => {
        cells.push($(cell).text().trim());
      });
      rows.push(cells);
    });

    // Calculate the maximum width for each column
    const columnWidths = headers.map((header, i) => {
      return Math.max(header.length, ...rows.map((row) => row[i].length));
    });

    // Format the table data with proper alignment
    let tableData = `<b>${headers.map((header, i) => header.padEnd(columnWidths[i])).join(" | ")}</b>\n`;
    tableData += `<i>${columnWidths.map((width) => "-".repeat(width)).join(" | ")}</i>\n`;
    rows.forEach((row) => {
      let change = row[3];
      if (change.includes("−") || change.includes("-")) {
        row[3] = `🔴 ${change}`;
      } else {
        row[3] = `🟢 ${change}`;
      }
      tableData += `${row.map((cell, i) => cell.padEnd(columnWidths[i])).join(" | ")}\n`;
    });

    const message = `
🌟 Today's Gold Prices in Bangalore 🌟\n\n
${tableData}\n
<i>Data sourced from <a href="https://www.goodreturns.in/gold-rates/bangalore.html">GoodReturns.in</a></i>
`;
    return message;
  } catch (error) {
    console.error("Error fetching gold prices:", error);
    return "Sorry, I couldn't fetch the gold prices. Please try again later.";
  }
}

// Command handler for /start
bot.start((ctx) => {
  ctx.reply("Hello! Use /gold to get today's gold price table in Bangalore.");
});

// Command handler for /gold
bot.command("gold", async (ctx) => {
  ctx.reply("Testing gold prices")
  //const goldPriceTable = await getGoldPrices();
  //ctx.replyWithHTML(goldPriceTable);
});

// Export the bot for Vercel
module.exports = async (req, res) => {
  if (req.method === "POST") {
    // Use Telegraf's webhookCallback to handle updates
    await bot.webhookCallback(req, res);
  } else {
    res.status(200).json({ status: "ok", message: "Server is running, thanx vercel folks" });
  }
};
