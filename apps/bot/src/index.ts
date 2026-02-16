import { Bot } from "grammy";
import "dotenv/config";
import { findOrCreateUser, findUserByTelegramId } from "./services/user";
import { prisma } from "@devvault/db";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const name = ctx.from?.first_name || "Developer";

  if (!telegramId) {
    await ctx.reply(
      "Something went wrong. Please try again. (Telegram ID not found)",
    );
    return;
  }

  try {
    const user = await findOrCreateUser(telegramId, name);
    const isNew = user.workspaces?.length === 2; // fresh user has exactly 2 defaults

    if (isNew) {
      await ctx.reply(
        `Welcome to DevVault, ${name}! 🔧\n\n` +
          `Your command center is ready.\n` +
          `Created workspaces: Personal & Work\n\n` +
          `Commands:\n` +
          `/help — See all commands\n` +
          `/tasks — View today's tasks`,
      );
    } else {
      await ctx.reply(`Welcome back, ${name}! 👋`);
    }
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `DevVault Commands:\n\n` +
      `/start — Initialize your account\n` +
      `/tasks — View today's tasks\n` +
      `/help — Show this message\n\n` +
      `More commands coming soon.`,
  );
});

bot.command("workspaces", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const name = ctx.from?.first_name || "Developer";

  if (!telegramId) {
    await ctx.reply("Please run /start command first");
    return;
  }

  const userData = await findUserByTelegramId(telegramId);

  if (!userData) {
    await ctx.reply("Please run /start command first");
    return;
  }

  const workspaces = userData?.workspaces || [];
  const workspaceEmojiMapping = {
    PERSONAL: "🏠",
    WORK: "💼 ",
    CUSTOM: "📁",
  };

  const workspaceData = workspaces.map((workspace) => ({
    name: workspace.name,
    type: workspace.type,
    emoji: workspaceEmojiMapping[workspace.type],
  }));

  let workspaceText = "";
  workspaceData.forEach((workspace) => {
    workspaceText += `${workspace.emoji} ${workspace.name}\n`;
  });

  if (workspaces) {
    await ctx.reply(`
        ${workspaceText}
        `);
  } else {
    await ctx.reply("No workspace found attached to the user");
  }
});

// Log errors instead of crashing
bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
console.log("DevVault bot is running...");
