import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── NLP Task Parser ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a task parser for a developer productivity app. Parse the user's message and return JSON with:
- intent: one of "add_task" | "add_snippet" | "add_command" | "add_reminder" | "query" | "mark_done" | "delete"
- For add_task intent, include these fields:
  - title: string (required) - the task title, cleaned up and properly formatted
  - workspace: string | null - workspace name if mentioned (e.g., "work", "personal")
  - priority: "P1" | "P2" | "P3" | "P4" | null - infer from urgency words like "urgent", "critical" (P1), "important" (P2), "normal" (P3), or "low priority" (P4)
  - dueDate: string | null - ISO 8601 date string. Parse natural language dates relative to today's date which will be provided. Examples: "tomorrow", "next week", "Friday", "in 3 days"
  - isSomeday: boolean - true if user says "someday", "maybe", "eventually"
  - description: string | null - any additional context or details

Always infer what you can from context. If someone says "urgent", assume P1. If they mention "tomorrow", calculate the actual date.
Respond with ONLY valid JSON, no markdown code blocks, no explanation.`;

export type ParsedIntent =
  | {
      intent: "add_task";
      title: string;
      workspace: string | null;
      priority: "P1" | "P2" | "P3" | "P4" | null;
      dueDate: string | null;
      isSomeday: boolean;
      description: string | null;
    }
  | {
      intent:
        | "add_snippet"
        | "add_command"
        | "add_reminder"
        | "query"
        | "mark_done"
        | "delete";
    };

export async function parseMessage(message: string): Promise<ParsedIntent> {
  const today = new Date().toISOString().split("T")[0];
  const prompt = `${SYSTEM_PROMPT}\n\nToday's date is ${today}.\n\nUser message: "${message}"`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  const cleanedResponse = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  console.log("Gemini NLP response:", cleanedResponse);

  return JSON.parse(cleanedResponse) as ParsedIntent;
}

// ─── Voice Transcription ──────────────────────────────────────────────────────

/**
 * Transcribes a voice message buffer using Gemini's audio understanding.
 * Telegram sends voice messages as OGG/Opus — Gemini handles this natively.
 */
export async function transcribeVoice(
  audioBuffer: Buffer,
  mimeType: string = "audio/ogg",
): Promise<string> {
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: audioBuffer.toString("base64"),
      },
    },
    {
      text: "Transcribe this voice message exactly as spoken. Return only the transcribed text, nothing else. No punctuation corrections, no paraphrasing — just what was said.",
    },
  ]);

  const transcript = result.response.text().trim();
  console.log("Voice transcript:", transcript);
  return transcript;
}

// ─── Screenshot Bug Extractor ─────────────────────────────────────────────────

export type ExtractedBug = {
  title: string;
  errorMessage: string | null;
  stackTrace: string | null;
  fileName: string | null;
  lineNumber: number | null;
  description: string;
};

/**
 * Sends a screenshot to Gemini Vision and extracts structured bug/error info.
 * Works for terminal errors, browser consoles, stack traces, compiler output, etc.
 */
export async function extractBugFromScreenshot(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
): Promise<ExtractedBug> {
  const prompt = `You are analyzing a screenshot of a software error or bug.
Extract the error information and return ONLY valid JSON with these fields:
- title: string — a short, descriptive bug title (e.g. "TypeError: Cannot read properties of undefined")
- errorMessage: string | null — the exact error message if visible
- stackTrace: string | null — the full stack trace if visible, preserve line breaks with \\n
- fileName: string | null — the file name where the error occurred (e.g. "auth.ts", "index.js")
- lineNumber: number | null — the line number where the error occurred
- description: string — a 1-2 sentence summary of what the error is and likely cause

If the screenshot doesn't show an error, return:
{"title": "Bug from screenshot", "errorMessage": null, "stackTrace": null, "fileName": null, "lineNumber": null, "description": "No clear error message found in screenshot."}

Respond with ONLY valid JSON. No markdown, no explanation.`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: imageBuffer.toString("base64"),
      },
    },
    { text: prompt },
  ]);

  const responseText = result.response.text().trim();
  const cleanedResponse = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  console.log("Bug extraction response:", cleanedResponse);

  return JSON.parse(cleanedResponse) as ExtractedBug;
}
