import { PrismaClient, WorkspaceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const user = await prisma.user.upsert({
    where: { telegramId: "demo_user" },
    update: {},
    create: {
      telegramId: "demo_user",
      name: "Pradyum",
      aiSettings: {
        aiEnabled: true,
        nlpParsing: true,
        voiceToTask: true,
        screenshotToTask: true,
        autoStandup: false,
        weeklyRecap: false,
        standupTime: "09:00",
        timezone: "Asia/Kolkata",
      },
    },
  });

  console.log(`Created user: ${user.name} (${user.id})`);

  // Create 2 default workspaces
  const personal = await prisma.workspace.upsert({
    where: { userId_slug: { userId: user.id, slug: "personal" } },
    update: {},
    create: {
      userId: user.id,
      name: "Personal",
      slug: "personal",
      color: "#4a9eed",
      icon: "user",
      isDefault: true,
      type: WorkspaceType.PERSONAL,
    },
  });

  const work = await prisma.workspace.upsert({
    where: { userId_slug: { userId: user.id, slug: "work" } },
    update: {},
    create: {
      userId: user.id,
      name: "Work",
      slug: "work",
      color: "#22c55e",
      icon: "briefcase",
      isDefault: true,
      type: WorkspaceType.WORK,
    },
  });

  console.log(`Created workspaces: ${personal.name}, ${work.name}`);

  // Create a sample task
  await prisma.task.create({
    data: {
      workspaceId: work.id,
      title: "Setup DevVault monorepo",
      description: "Initialize Turborepo with web app, bot, and shared packages",
      priority: "P1",
      status: "DONE",
    },
  });

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });