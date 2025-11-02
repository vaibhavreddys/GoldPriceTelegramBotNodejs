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

// Parse currency-like strings to a normalized numeric string (remove non-digits except dot and minus)
function normalizePriceString(s) {
  if (!s) return "";
  // Remove currency symbol and commas but keep minus/dot if present
  return s.replace(/[^\d\.\-]/g, "").trim();
}

/*
  Function to fetch gold prices using the page structure provided in the example:

  Expected HTML structure (simplified):
  <div class="gold-rate-container">
    <div class="gold-each-container">
      <div class="gold-top">
        <p class="gold-common-head">24K&nbsp;Gold&nbsp;<span>/g</span></p>
      </div>
      <div class="gold-bottom">
        <p class="gold-common-head"><span id="24K-price">₹12,300</span></p>
      </div>
    </div>
    ... 22K ... 18K ...
  </div>

  We'll extract 24K, 22K and 18K. We'll highlight 22K in the output (make it bold and put a star).
*/
async function getGoldPrices() {
  const url = "https://www.goodreturns.in/gold-rates/bangalore.html";

  try {
    const html = await cloudscraper.get(url);
    const $ = cheerio.load(html);

    // Prepare result object
    const prices = {
      "24K": null,
      "22K": null,
      "18K": null,
    };

    // Strategy:
    // - Look for the container .gold-rate-container and iterate its .gold-each-container children.
    // - For each child, read the top label (contains "24K Gold", "22K Gold", etc.)
    // - Read the bottom span (which in your example has id like "24K-price") for the numeric value.
    const container = $(".gold-rate-container").first();

    if (container && container.length) {
      container.find(".gold-each-container").each((i, el) => {
        const topText = $(el).find(".gold-top .gold-common-head").first().text() || "";
        const bottomSpan = $(el).find(".gold-bottom .gold-common-head span").first();
        const bottomText = bottomSpan.text() ? bottomSpan.text().trim() : "";

        // Normalize topText: remove extra spaces and non-alphanumeric except K and digits
        const topNorm = topText.replace(/\s+/g, " ").trim();

        // Detect which karat this block corresponds to
        if (/24\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("24k")) {
          prices["24K"] = bottomText;
        } else if (/22\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("22k")) {
          prices["22K"] = bottomText;
        } else if (/18\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("18k")) {
          prices["18K"] = bottomText;
        } else {
          // attempt fuzzy detection: if top contains only a number like "22K Gold"
          const m = topNorm.match(/(\d+)\s*K/i);
          if (m && m[1]) {
            const key = `${m[1]}K`;
            if (key in prices) prices[key] = bottomText;
          }
        }
      });
    }

    // If container not found or some values missing, try fallbacks:
    // 1) Direct id selection by id (#24K-price, #22K-price, #18K-price)
    ["24K", "22K", "18K"].forEach((k) => {
      if (!prices[k]) {
        const idSelector = `#${k}-price`;
        const el = $(idSelector).first();
        if (el && el.length) prices[k] = el.text().trim();
      }
    });

    // 2) Generic span scanning: find spans with ids containing "24" or "22" or "18"
    if (!prices["24K"] || !prices["22K"] || !prices["18K"]) {
      $("span").each((i, el) => {
        const id = ($(el).attr("id") || "").toLowerCase();
        const text = $(el).text().trim();
        if (!text) return;
        if (!prices["24K"] && (id.includes("24k") || id.includes("24"))) prices["24K"] = prices["24K"] || text;
        if (!prices["22K"] && (id.includes("22k") || id.includes("22"))) prices["22K"] = prices["22K"] || text;
        if (!prices["18K"] && (id.includes("18k") || id.includes("18"))) prices["18K"] = prices["18K"] || text;
      });
    }

    // Final normalization: if still null, set friendly placeholder
    Object.keys(prices).forEach((k) => {
      if (!prices[k]) prices[k] = "N/A";
    });

    // Build a monospace table so alignment is preserved; highlight 22K
    // We'll build lines like: "24K: ₹12,300"
    const entries = ["24K", "22K", "18K"].map((k) => {
      const value = prices[k];
      if (k === "22K") {
        // Highlight 22K: bold + star + larger emphasis using emojis
        return `★ <b>${escapeHtml(k)}: ${escapeHtml(value)}</b> ★`;
      }
      return `${escapeHtml(k)}: ${escapeHtml(value)}`;
    });

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const message = `<b>🌟 Today's Gold Prices — Bangalore</b>\n\n<pre>${entries.join("\n")}</pre>\n\n<i>Highlighted 22K is commonly used for jewellery.</i>\n\n<i>Last checked: ${escapeHtml(now)} (IST)</i>\n\n<i>Data sourced from <a href="https://www.goodreturns.in/gold-rates/bangalore.html">GoodReturns.in</a></i>`;

    return message;
  } catch (error) {
    console.error("Error fetching gold prices:", error && error.message ? error.message : error);
    return "Sorry, I couldn't fetch the gold prices. Please try again later.";
  }
}

// Command handler for /start
bot.start((ctx) => {
  ctx.reply("Hello! Use /gold to get today's 24K, 22K and 18K gold prices in Bangalore (22K is highlighted).");
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
