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

// Fetch gold prices (24K, 22K, 18K) — returns HTML message
async function getGoldPrices() {
  const url = "https://www.goodreturns.in/gold-rates/bangalore.html";

  try {
    const html = await cloudscraper.get(url);
    const $ = cheerio.load(html);

    const prices = { "24K": null, "22K": null, "18K": null };

    const container = $(".gold-rate-container").first();

    if (container && container.length) {
      container.find(".gold-each-container").each((i, el) => {
        const topText = $(el).find(".gold-top .gold-common-head").first().text() || "";
        const bottomSpan = $(el).find(".gold-bottom .gold-common-head span").first();
        const bottomText = bottomSpan.text() ? bottomSpan.text().trim() : "";

        const topNorm = topText.replace(/\s+/g, " ").trim();

        if (/24\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("24k")) {
          prices["24K"] = bottomText;
        } else if (/22\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("22k")) {
          prices["22K"] = bottomText;
        } else if (/18\s*K/i.test(topNorm) || (bottomSpan.attr("id") || "").toLowerCase().includes("18k")) {
          prices["18K"] = bottomText;
        } else {
          const m = topNorm.match(/(\d+)\s*K/i);
          if (m && m[1]) {
            const key = `${m[1]}K`;
            if (key in prices) prices[key] = bottomText;
          }
        }
      });
    }

    // Fallbacks by id
    ["24K", "22K", "18K"].forEach((k) => {
      if (!prices[k]) {
        const el = $(`#${k}-price`).first();
        if (el && el.length) prices[k] = el.text().trim();
      }
    });

    // Final fallbacks scanning spans
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

    Object.keys(prices).forEach((k) => {
      if (!prices[k]) prices[k] = "N/A";
    });

    const entries = ["24K", "22K", "18K"].map((k) => {
      const value = prices[k];
      if (k === "22K") {
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

// Fetch silver prices (1g and 1kg) — returns HTML message
async function getSilverPrices() {
  const url = "https://www.goodreturns.in/silver-rates/bangalore.html";

  try {
    const html = await cloudscraper.get(url);
    const $ = cheerio.load(html);

    const prices = { "1g": null, "1kg": null };

    const container = $(".gold-rate-container").first();

    if (container && container.length) {
      container.find(".gold-each-container").each((i, el) => {
        const topText = $(el).find(".gold-top .gold-common-head").first().text() || "";
        const bottomSpan = $(el).find(".gold-bottom .gold-common-head span").first();
        const bottomText = bottomSpan.text() ? bottomSpan.text().trim() : "";

        const topNorm = topText.replace(/\s+/g, " ").trim().toLowerCase();

        if (topNorm.includes("/g") || topNorm.includes(" /g") || topNorm.includes("per g") || topNorm.includes("1g")) {
          prices["1g"] = bottomText;
        } else if (topNorm.includes("/kg") || topNorm.includes(" /kg") || topNorm.includes("per kg") || topNorm.includes("1kg")) {
          prices["1kg"] = bottomText;
        } else {
          // fallback based on span id
          const id = (bottomSpan.attr("id") || "").toLowerCase();
          if (id.includes("1g") || id.includes("1g-price") || id.includes("silver-1g")) prices["1g"] = bottomText;
          if (id.includes("1kg") || id.includes("1kg-price") || id.includes("silver-1kg")) prices["1kg"] = bottomText;
        }
      });
    }

    // Fallbacks by id
    if (!prices["1g"]) {
      const el = $("#silver-1g-price").first();
      if (el && el.length) prices["1g"] = el.text().trim();
    }
    if (!prices["1kg"]) {
      const el = $("#silver-1kg-price").first();
      if (el && el.length) prices["1kg"] = el.text().trim();
    }

    // Generic span scan fallback
    if (!prices["1g"] || !prices["1kg"]) {
      $("span").each((i, el) => {
        const id = ($(el).attr("id") || "").toLowerCase();
        const text = $(el).text().trim();
        if (!text) return;
        if (!prices["1g"] && (id.includes("1g") || id.includes("1g-price") || id.includes("silver-1g"))) prices["1g"] = prices["1g"] || text;
        if (!prices["1kg"] && (id.includes("1kg") || id.includes("1kg-price") || id.includes("silver-1kg"))) prices["1kg"] = prices["1kg"] || text;
      });
    }

    Object.keys(prices).forEach((k) => {
      if (!prices[k]) prices[k] = "N/A";
    });

    // Highlight 1g as most commonly used for quick checks (similar approach to 22K highlight)
    const entries = [
      `${escapeHtml("1g")}: ${escapeHtml(prices["1g"])}`,
      `${escapeHtml("1kg")}: ${escapeHtml(prices["1kg"])}`,
    ];

    // Make 1g prominent with an emoji and bold
    entries[0] = `★ <b>${entries[0]}</b> ★`;

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const message = `<b>🌟 Today's Silver Prices — Bangalore</b>\n\n<pre>${entries.join("\n")}</pre>\n\n<i>Highlighted 1g is commonly used for quick reference.</i>\n\n<i>Last checked: ${escapeHtml(now)} (IST)</i>\n\n<i>Data sourced from <a href="https://www.goodreturns.in/silver-rates/bangalore.html">GoodReturns.in</a></i>`;

    return message;
  } catch (error) {
    console.error("Error fetching silver prices:", error && error.message ? error.message : error);
    return "Sorry, I couldn't fetch the silver prices. Please try again later.";
  }
}

// Command handler for /start
bot.start((ctx) => {
  ctx.reply("Hello! Use /gold to get today's 24K, 22K and 18K gold prices in Bangalore (22K is highlighted). Use /silver to get silver prices (1g and 1kg).");
});

// Command handler for /gold
bot.command("gold", async (ctx) => {
  const goldPriceMessage = await getGoldPrices();
  ctx.replyWithHTML(goldPriceMessage, { disable_web_page_preview: true });
});

// Command handler for /silver
bot.command("silver", async (ctx) => {
  const silverPriceMessage = await getSilverPrices();
  ctx.replyWithHTML(silverPriceMessage, { disable_web_page_preview: true });
});

// Start the bot
// bot.launch(); // Disabled for environments (Vercel) that use webhooks

// Export the bot for Vercel
module.exports = bot;
