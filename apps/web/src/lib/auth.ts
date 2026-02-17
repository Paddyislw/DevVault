import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@devvault/db";
import crypto from "crypto";

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

export const authOptions: NextAuthOptions = {
  providers: [
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
        const telegramId = data.id;
        let user = await prisma.user.findUnique({
          where: { telegramId },
        });

        if (!user) {
          // First web login — create user + default workspaces
          user = await prisma.user.create({
            data: {
              telegramId,
              name: [data.first_name, data.last_name].filter(Boolean).join(" "),
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
