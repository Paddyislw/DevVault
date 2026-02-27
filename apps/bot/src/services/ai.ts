import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

  // Clean up response - remove markdown code blocks if present
  const cleanedResponse = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  console.log("Gemini raw response:", responseText);
  console.log("Cleaned response:", cleanedResponse);

  return JSON.parse(cleanedResponse) as ParsedIntent;
}
