import crypto from "crypto";

interface TelegramWebAppUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface VerifyResult {
  valid: boolean;
  user?: TelegramWebAppUser;
}

const MAX_AUTH_AGE_SECONDS = 3600;

// Telegram Mini App initData uses a DIFFERENT secret-key derivation than the
// Login Widget's verifyTelegramAuth (SHA256(botToken) there vs
// HMAC-SHA256("WebAppData", botToken) here) — don't assume they're
// interchangeable.
export function verifyInitData(initData: string, botToken: string): VerifyResult {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false };

  const checkString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  if (computedHash !== hash) return { valid: false };

  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > MAX_AUTH_AGE_SECONDS) {
    return { valid: false };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { valid: false };

  try {
    const parsed = JSON.parse(userRaw);
    if (!parsed?.id) return { valid: false };
    return {
      valid: true,
      user: {
        id: String(parsed.id),
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        username: parsed.username,
      },
    };
  } catch {
    return { valid: false };
  }
}
