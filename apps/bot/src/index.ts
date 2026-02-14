import { Bot } from "grammy";
import "dotenv/config";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => {
  ctx.reply("Welcome to DevVault! 🔧\nYour developer command center.");
});

bot.start();
console.log("Bot is running...");