import { prisma } from "@devvault/db";

export async function findOrCreateUser(telegramId: string, name: string) {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { telegramId },
    include: { workspaces: true },
  });

  if (existing) return existing;

  // Create new user with 2 default workspaces
  const user = await prisma.user.create({
    data: {
      telegramId,
      name,
      workspaces: {
        create: [
          {
            name: "Personal",
            slug: "personal",
            color: "#4a9eed",
            icon: "user",
            isDefault: true,
            type: "PERSONAL",
          },
          {
            name: "Work",
            slug: "work",
            color: "#8b5cf6",
            icon: "briefcase",
            isDefault: true,
            type: "WORK",
          },
        ],
      },
    },
    include: {
      workspaces: true,
    },
  });

  return user;
}


export async function findUserByTelegramId(telegramId: string) {
  return await prisma.user.findUnique({
    where: { telegramId },
    include: { workspaces: true },
  });
}
