
import "dotenv/config";
import { Bot } from "grammy";
import {
  extractTournamentId,
  getTournament,
  formatTournament,
} from "./tournament.js";

const botToken = process.env.BOT_TOKEN;
const apiToken = process.env.CHGK_API_TOKEN;
const channelId = process.env.CHANNEL_ID;

if (!botToken || !apiToken || !channelId) {
  throw new Error("Заполни BOT_TOKEN, CHGK_API_TOKEN и CHANNEL_ID");
}

const bot = new Bot(botToken);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Пришли ссылку на турнир rating.chgk.info — подготовлю пост."
  );
});

bot.on("message:text", async (ctx) => {
  const id = extractTournamentId(ctx.message.text);

  if (!id) {
    await ctx.reply("Не удалось распознать ссылку на турнир.");
    return;
  }

  await ctx.reply("Получаю данные турнира…");

  try {
    const tournament = await getTournament(id, apiToken);
    const message = formatTournament(tournament);

    await bot.api.sendMessage(channelId, message, {
      parse_mode: "HTML",
    });

    await ctx.reply("Пост опубликован в канале.");
  } catch (error) {
    console.error("Tournament publishing failed:", error);

    await ctx.reply(
      "Не удалось получить данные или опубликовать пост. Проверь токены, права бота и доступность API."
    );
  }
});

bot.catch((error) => {
  console.error("Telegram bot error:", error);
});

bot.start();
console.log("CHGK bot started");
