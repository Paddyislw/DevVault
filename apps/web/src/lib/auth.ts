import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@devvault/db";
import crypto from "crypto";
import { verifyPassword } from "./password";
import { verifyInitData } from "./telegram-webapp";

function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  // Only include fields that Telegram actually sends
  const telegramFields = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"];
  
  const hash = data.hash;
  if (!hash) return false;

  const checkString = telegramFields
    .filter((key) => key !== "hash" && data[key] !== undefined)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return hmac === hash;
}

// Find or create the user + their two default workspaces.
// Shared by the Telegram provider and the dev provider.
async function findOrCreateUser(telegramId: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      telegramId,
      name,
      workspaces: {
        create: [
          {
            name: "Personal",
            slug: "personal",
            color: "#3b82f6",
            isDefault: true,
            type: "PERSONAL",
          },
          {
            name: "Work",
            slug: "work",
            color: "#22c55e",
            isDefault: true,
            type: "WORK",
          },
        ],
      },
    },
  });
}

// Only ever true on a local dev server with the flag explicitly set.
export const devLoginEnabled =
  process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "true";

const devProvider = CredentialsProvider({
  id: "dev",
  name: "Dev Login",
  credentials: {
    telegramId: { label: "Telegram ID", type: "text" },
  },
  async authorize(credentials) {
    // Re-check at call time — never trust that the provider list was built
    // in the environment it's running in.
    if (!devLoginEnabled) return null;

    const telegramId = credentials?.telegramId || process.env.DEV_TELEGRAM_ID;
    if (!telegramId) {
      console.warn("[dev login] no telegramId given and DEV_TELEGRAM_ID unset");
      return null;
    }

    const user = await findOrCreateUser(telegramId, `Dev User ${telegramId}`);
    return {
      id: user.id,
      name: user.name,
      telegramId: user.telegramId,
    };
  },
});

// Password login — alternative to the Telegram widget, for accounts that
// already linked Telegram once and set a password from Settings. A user
// with no loginPasswordHash can never sign in through this provider, so
// setting the password (which requires an authenticated session) is the
// only way to enable it.
const passwordProvider = CredentialsProvider({
  id: "password",
  name: "Password",
  credentials: {
    telegramId: { label: "Telegram ID", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const telegramId = credentials?.telegramId;
    const password = credentials?.password;
    if (!telegramId || !password) return null;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || !user.loginPasswordHash) return null;

    const valid = await verifyPassword(password, user.loginPasswordHash);
    if (!valid) return null;

    return {
      id: user.id,
      name: user.name,
      telegramId: user.telegramId,
    };
  },
});

// Telegram Mini App login — verifies the initData Telegram injects when the
// page is opened inside its own WebView, rather than the Login Widget flow.
const miniAppProvider = CredentialsProvider({
  id: "telegram-miniapp",
  name: "Telegram Mini App",
  credentials: {
    initData: { label: "Init Data", type: "text" },
  },
  async authorize(credentials) {
    const initData = credentials?.initData;
    if (!initData) return null;

    const result = verifyInitData(initData, process.env.BOT_TOKEN!);
    if (!result.valid || !result.user) return null;

    const user = await findOrCreateUser(
      result.user.id,
      [result.user.first_name, result.user.last_name].filter(Boolean).join(" "),
    );

    return {
      id: user.id,
      name: user.name,
      telegramId: user.telegramId,
    };
  },
});

export const authOptions: NextAuthOptions = {
  providers: [
    ...(devLoginEnabled ? [devProvider] : []),
    passwordProvider,
    miniAppProvider,
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {},
      async authorize(credentials) {
        const data = credentials as Record<string, string>;
        console.log("=== TELEGRAM AUTH DEBUG ===");
        console.log("Received data:", JSON.stringify(data, null, 2));

        const isValid = verifyTelegramAuth(data, process.env.BOT_TOKEN!);
        console.log("BOT_TOKEN exists:", !!process.env.BOT_TOKEN);
        console.log("Hash valid:", isValid);

        if (!isValid) {
          console.log("FAILED: Hash verification");
          return null;
        }

        const authDate = parseInt(data.auth_date);
        const now = Math.floor(Date.now() / 1000);
        console.log("Auth date diff (seconds):", now - authDate);

        if (now - authDate > 300) {
          console.log("FAILED: Auth too old");
          return null;
        }

        // Find or create user in DB
        const user = await findOrCreateUser(
          data.id,
          [data.first_name, data.last_name].filter(Boolean).join(" ")
        );

        return {
          id: user.id,
          name: user.name,
          telegramId: user.telegramId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On first sign in, add user data to token
      if (user) {
        token.userId = user.id;
        token.telegramId = (user as any).telegramId;
      }
      return token;
    },
    async session({ session, token }) {
      // Make user data available in session
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).telegramId = token.telegramId;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
};
