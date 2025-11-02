const { Telegraf } = require("telegraf");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

// Fetch the token from the environment variable
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  throw new Error("No TOKEN environment variable found. Please set the TOKEN variable.");
}

// Initialize the bot
const bot = new Telegraf(TOKEN);

// Escape HTML to avoid accidental markup when using replyWithHTML
function escapeHtml(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Function to fetch gold prices using the specific element example:
// <p class="gold-common-head"><span id="22K-price">₹11,275</span></p>
async function getGoldPrices() {
  const url = "https://www.goodreturns.in/gold-rates/bangalore.html";

  try {
    // Use cloudscraper to bypass Cloudflare
    const html = await cloudscraper.get(url);

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Attempt to find the 22K price by id first (exact match to the example)
    const price22kById = $('#22K-price').first();
    if (price22kById && price22kById.length) {
      const value = price22kById.text().trim();
      const message = `<b>🌟 Gold Price (22K) — Bangalore</b>\n\n<pre>22K: ${escapeHtml(value)}</pre>\n\n<i>Data sourced from <a href="https://www.goodreturns.in/gold-rates/bangalore.html">GoodReturns.in</a></i>`;
      return message;
    }

    // If the id isn't present, try the class-based selector shown in the example
    // The structure in the example: <p class="gold-common-head"><span id="22K-price">₹11,275</span></p>
    // So look for .gold-common-head > span (and try to pick a span whose id contains "22K" or "22k" or "22K-price")
    let fallbackValue = "";
    $('.gold-common-head').each((i, el) => {
      const span = $(el).find('span').first();
      if (span && span.length) {
        const id = (span.attr('id') || "").toLowerCase();
        if (id.includes('22k') || id.includes('22k-price') || id.includes('22k_price')) {
          fallbackValue = span.text().trim();
          return false; // break out of each
        }
        // if not specifically 22K id, capture the first span as a general fallback
        if (!fallbackValue) fallbackValue = span.text().trim();
      }
    });

    if (fallbackValue) {
      const message = `<b>🌟 Gold Price (22K) — Bangalore</b>\n\n<pre>22K: ${escapeHtml(fallbackValue)}</pre>\n\n<i>Data sourced from <a href="https://www.goodreturns.in/gold-rates/bangalore.html">GoodReturns.in</a></i>`;
      return message;
    }

    // As a last resort, try to find any span whose id contains "22" and "k" (robust for different casing/formatting)
    let generic = "";
    $('span').each((i, el) => {
      const id = ( $(el).attr('id') || "" ).toLowerCase();
      if (id.includes('22k') || id.includes('22-k') || id.includes('22_k') || id === '22k-price') {
        generic = $(el).text().trim();
        return false;
      }
    });

    if (generic) {
      const message = `<b>🌟 Gold Price (22K) — Bangalore</b>\n\n<pre>22K: ${escapeHtml(generic)}</pre>\n\n<i>Data sourced from <a href="https://www.goodreturns.in/gold-rates/bangalore.html">GoodReturns.in</a></i>`;
      return message;
    }

    // Nothing found
    return "Sorry, I couldn't locate the 22K gold price on the page. The page structure may have changed.";
  } catch (error) {
    console.error("Error fetching gold prices:", error && error.message ? error.message : error);
    return "Sorry, I couldn't fetch the gold prices. Please try again later.";
  }
}

// Command handler for /start
bot.start((ctx) => {
  ctx.reply("Hello! Use /gold to get today's 22K gold price in Bangalore.");
});

// Command handler for /gold
bot.command("gold", async (ctx) => {
  const goldPriceMessage = await getGoldPrices();
  ctx.replyWithHTML(goldPriceMessage, { disable_web_page_preview: true });
});

// Start the bot
// bot.launch(); // Disabled for environments (Vercel) that use webhooks

// Export the bot for Vercel
module.exports = bot;
