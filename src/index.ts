
import "dotenv/config";
import {
  Bot,
  InlineKeyboard,
} from "grammy";

import {
  extractTournamentId,
  getTournament,
  formatTournament,
} from "./tournament.js";
import process from "process";

const botToken = process.env.BOT_TOKEN;
const apiToken = process.env.CHGK_API_TOKEN;
const channelId = process.env.CHANNEL_ID;
const adminId = Number(process.env.ADMIN_USER_ID);

if (
  !botToken ||
  !apiToken ||
  !channelId ||
  !Number.isSafeInteger(adminId) ||
  adminId <= 0
) {
  throw new Error(
    "Check BOT_TOKEN, CHGK_API_TOKEN, CHANNEL_ID and ADMIN_USER_ID",
  );
}

const bot = new Bot(botToken);

interface PendingPost {
  ownerId: number;
  text: string;
  tournamentId: number;
}

const pendingPosts = new Map<string, PendingPost>();
let nextPostId = 1;

function isAdmin(userId: number): boolean {
  return userId === adminId;
}

bot.command("start", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Нет доступа.");
    return;
  }

  await ctx.reply(
    "Пришли ссылку на турнир rating.chgk.info. " +
    "Я подготовлю пост, и ты сможешь подтвердить публикацию.",
  );
});

bot.on("message:text", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Нет доступа.");
    return;
  }

  const tournamentId = extractTournamentId(
    ctx.message.text,
  );

  if (!tournamentId) {
    await ctx.reply(
      "Не удалось распознать ссылку. " +
      "Ожидаю ссылку вида " +
      "https://rating.chgk.info/tournament/12345",
    );
    return;
  }

  await ctx.reply("Получаю информацию о турнире…");

  try {
    const tournament = await getTournament(
      tournamentId,
      apiToken,
    );

    const text = formatTournament(tournament);
    const postId = String(nextPostId++);

    pendingPosts.set(postId, {
      ownerId: ctx.from.id,
      text,
      tournamentId,
    });

    const keyboard = new InlineKeyboard()
      .text("✅ Опубликовать", `publish:${postId}`)
      .text("❌ Отмена", `cancel:${postId}`);

    await ctx.reply(
      `Предпросмотр поста:\n\n${text}`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      },
    );
  } catch (error) {
    console.error("Tournament lookup failed:", error);

    await ctx.reply(
      "Не удалось получить турнир. " +
      "Проверь токен API, ID турнира и доступность сайта.",
    );
  }
});

bot.callbackQuery(/^publish:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({
      text: "Нет доступа.",
      show_alert: true,
    });
    return;
  }

  const postId = ctx.match[1];
  const post = pendingPosts.get(postId);

  if (!post || post.ownerId !== ctx.from.id) {
    await ctx.answerCallbackQuery({
      text: "Предпросмотр истёк или уже обработан.",
      show_alert: true,
    });
    return;
  }

  try {
    await bot.api.sendMessage(channelId, post.text, {
      parse_mode: "HTML",
    });

    pendingPosts.delete(postId);

    await ctx.answerCallbackQuery({
      text: "Пост опубликован!",
    });

    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard(),
    });

    await ctx.reply(
      `Турнир ${post.tournamentId} опубликован в канале.`,
    );
  } catch (error) {
    console.error("Publishing failed:", error);

    await ctx.answerCallbackQuery({
      text: "Не удалось опубликовать. Проверь права бота.",
      show_alert: true,
    });
  }
});

bot.callbackQuery(/^cancel:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({
      text: "Нет доступа.",
      show_alert: true,
    });
    return;
  }

  const postId = ctx.match[1];
  const post = pendingPosts.get(postId);

  if (!post || post.ownerId !== ctx.from.id) {
    await ctx.answerCallbackQuery({
      text: "Предпросмотр уже обработан.",
    });
    return;
  }

  pendingPosts.delete(postId);

  await ctx.answerCallbackQuery({
    text: "Публикация отменена.",
  });

  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard(),
  });

  await ctx.reply("Пост отменён.");
});

bot.catch((error) => {
  console.error("Bot error:", error);
});

bot.start();
console.log("CHGK bot started");
