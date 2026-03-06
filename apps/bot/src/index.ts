import { Bot, Context } from "grammy";
import "dotenv/config";
import { findOrCreateUser, findUserByTelegramId } from "./services/user";
import {
  getTodayTasks,
  getSomedayTasks,
  getBacklogTasks,
  formatTasksByPriority,
  createTask,
} from "./services/task";
import {
  parseMessage,
  transcribeVoice,
  extractBugFromScreenshot,
} from "./services/ai";

const bot = new Bot(process.env.BOT_TOKEN!);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Downloads a Telegram file and returns it as a Buffer. */
async function downloadTelegramFile(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const file = await bot.api.getFile(fileId);
  const filePath = file.file_path;

  if (!filePath) throw new Error("File path not available from Telegram");

  const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(`Failed to download file: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    ogg: "audio/ogg",
    oga: "audio/ogg",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  return {
    buffer,
    mimeType: mimeMap[ext ?? ""] ?? "application/octet-stream",
  };
}

/** Formats a task's due date for display in bot messages. */
function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) return "Today";
  if (taskDate.getTime() === tomorrow.getTime()) return "Tomorrow";

  return dueDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Formats a created task into a bot confirmation message. */
function formatTaskConfirmation(
  task: {
    title: string;
    workspace: { name: string };
    priority: string | null;
    dueDate: Date | null;
    isSomeday: boolean;
  },
  prefix: string,
): string {
  const dueDateDisplay = formatDueDate(task.dueDate);
  const details = [
    task.workspace.name,
    task.priority,
    dueDateDisplay ? `Due: ${dueDateDisplay}` : null,
    task.isSomeday ? "Someday" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `${prefix}\n${task.title}\n${details}`;
}

/** Extracts user + guards with /start reminder. Returns null if not found. */
async function getAuthenticatedUser(ctx: Context) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) {
    await ctx.reply("Please run /start first");
    return null;
  }
  const user = await findUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply("Please run /start first to set up your account.");
    return null;
  }
  return user;
}

/**
 * Edits a bot message in-place.
 * If the status message was deleted by the user before we could edit it,
 * falls back to sending a new reply instead of crashing the handler.
 */
async function safeEdit(
  ctx: Context,
  chatId: number,
  messageId: number,
  text: string,
  options?: { parse_mode?: "Markdown" | "MarkdownV2" | "HTML" },
): Promise<void> {
  try {
    await ctx.api.editMessageText(chatId, messageId, text, options);
  } catch {
    // Status message was deleted — send as new message instead
    await ctx.reply(text, options);
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

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
    const isNew = user.workspaces?.length === 2;

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
      `/backlog — View someday/backlog tasks\n` +
      `/workspaces — List your workspaces\n` +
      `/help — Show this message\n\n` +
      `🎤 Voice — Send a voice note to create tasks\n` +
      `📸 Photo — Send an error screenshot to create a bug task`,
  );
});

bot.command("tasks", async (ctx) => {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  try {
    const tasks = await getTodayTasks(user.id);
    const message = formatTasksByPriority(
      tasks,
      "📋 Today's Tasks",
      "No tasks for today. Enjoy your day! ✨",
      "Use /backlog to see someday items.",
    );
    await ctx.reply(message);
  } catch (error) {
    console.error("Error in /tasks:", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

bot.command("backlog", async (ctx) => {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  try {
    const somedayTasks = await getSomedayTasks(user.id);
    const backlogTasks = await getBacklogTasks(user.id);

    let message = "📦 Someday & Backlog\n\n";

    if (somedayTasks.length === 0 && backlogTasks.length === 0) {
      message += "No someday or backlog tasks.\nAll clear! 🎉";
    } else {
      if (somedayTasks.length > 0) {
        message += formatTasksByPriority(somedayTasks, "🌤 Someday", "");
        message += "\n\n";
      }
      if (backlogTasks.length > 0) {
        message += formatTasksByPriority(backlogTasks, "📥 Backlog", "");
      }
    }

    await ctx.reply(message.trim());
  } catch (error) {
    console.error("Error in /backlog:", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

bot.command("workspaces", async (ctx) => {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  const workspaces = user.workspaces || [];
  const emojiMap: Record<string, string> = {
    PERSONAL: "🏠",
    WORK: "💼",
    CUSTOM: "📁",
  };

  if (workspaces.length === 0) {
    await ctx.reply("No workspaces found.");
    return;
  }

  const lines = workspaces
    .map((ws) => `${emojiMap[ws.type] ?? "📁"} ${ws.name}`)
    .join("\n");

  await ctx.reply(`Your workspaces:\n\n${lines}`);
});

// ─── Text Messages (NLP) ──────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  try {
    const parsed = await parseMessage(text);

    if (parsed.intent === "add_task") {
      const task = await createTask({
        userId: user.id,
        title: parsed.title,
        workspaceName: parsed.workspace,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        isSomeday: parsed.isSomeday,
        description: parsed.description,
      });

      await ctx.reply(formatTaskConfirmation(task, "✅ Task created"));
    } else {
      await ctx.reply(
        "I understood your message, but this feature isn't available yet.\n\n" +
          "Try describing a task:\n" +
          '"Fix the login bug tomorrow P1 work"',
      );
    }
  } catch (error) {
    console.error("Error parsing message:", error);
    await ctx.reply(
      "I couldn't understand that. Try:\n" +
        '"Add a task to fix CORS bug tomorrow"\n' +
        '"Review PR for auth module P2 work"',
    );
  }
});

// ─── Voice Messages → Task ────────────────────────────────────────────────────

bot.on("message:voice", async (ctx) => {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  const statusMsg = await ctx.reply("🎤 Transcribing voice note...");
  const chatId = ctx.chat.id;
  const msgId = statusMsg.message_id;

  try {
    const fileId = ctx.message.voice.file_id;
    const { buffer, mimeType } = await downloadTelegramFile(fileId);

    const transcript = await transcribeVoice(buffer, mimeType);

    if (!transcript || transcript.trim().length === 0) {
      await safeEdit(
        ctx,
        chatId,
        msgId,
        "❌ Couldn't transcribe the voice note. Please try again.",
      );
      return;
    }

    await safeEdit(
      ctx,
      chatId,
      msgId,
      `🎤 Heard: "${transcript}"\n\nParsing...`,
    );

    const parsed = await parseMessage(transcript);

    if (parsed.intent === "add_task") {
      const task = await createTask({
        userId: user.id,
        title: parsed.title,
        workspaceName: parsed.workspace,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        isSomeday: parsed.isSomeday,
        description: parsed.description,
      });

      await safeEdit(
        ctx,
        chatId,
        msgId,
        `🎤 "${transcript}"\n\n` +
          formatTaskConfirmation(task, "✅ Task created"),
      );
    } else {
      await safeEdit(
        ctx,
        chatId,
        msgId,
        `🎤 Heard: "${transcript}"\n\n` +
          "I transcribed your note but couldn't identify a task.\n" +
          'Try saying something like "Fix the auth bug tomorrow P1 work".',
      );
    }
  } catch (error) {
    console.error("Error in voice handler:", error);
    await safeEdit(
      ctx,
      chatId,
      msgId,
      "❌ Something went wrong processing your voice note. Please try again.",
    );
  }
});

// ─── Photos → Bug Task ────────────────────────────────────────────────────────

bot.on("message:photo", async (ctx) => {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return;

  const statusMsg = await ctx.reply("📸 Analyzing screenshot...");
  const chatId = ctx.chat.id;
  const msgId = statusMsg.message_id;

  try {
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    const { buffer, mimeType } = await downloadTelegramFile(
      largestPhoto.file_id,
    );

    const bug = await extractBugFromScreenshot(buffer, mimeType);

    const descriptionParts: string[] = [];
    if (bug.errorMessage) {
      descriptionParts.push(`**Error:** ${bug.errorMessage}`);
    }
    if (bug.fileName || bug.lineNumber) {
      const location = [
        bug.fileName,
        bug.lineNumber ? `line ${bug.lineNumber}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      descriptionParts.push(`**Location:** ${location}`);
    }
    if (bug.stackTrace) {
      descriptionParts.push(
        `**Stack Trace:**\n\`\`\`\n${bug.stackTrace}\n\`\`\``,
      );
    }
    descriptionParts.push(`**Summary:** ${bug.description}`);
    descriptionParts.push("_Created from screenshot via DevVault bot_");

    const task = await createTask({
      userId: user.id,
      title: bug.title,
      workspaceName: null,
      priority: "P1",
      dueDate: null,
      isSomeday: false,
      description: descriptionParts.join("\n\n"),
    });

    const confirmLines = [
      "🐛 Bug task created from screenshot",
      "",
      `*${task.title}*`,
      [task.workspace.name, "P1", "Bug"].join(" · "),
    ];

    if (bug.errorMessage) {
      confirmLines.push("", `Error: ${bug.errorMessage}`);
    }
    if (bug.fileName) {
      const fileInfo = [
        bug.fileName,
        bug.lineNumber ? `L${bug.lineNumber}` : null,
      ]
        .filter(Boolean)
        .join(":");
      confirmLines.push(`File: ${fileInfo}`);
    }

    await safeEdit(ctx, chatId, msgId, confirmLines.join("\n"), {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error in photo handler:", error);
    await safeEdit(
      ctx,
      chatId,
      msgId,
      "❌ Something went wrong analyzing the screenshot. Make sure it shows an error or code.",
    );
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
console.log("DevVault bot is running...");