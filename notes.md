1 - upsert -> create if doesn't exist, skip if it does (It's safe to run multiple times.)

2 - Cascade means if you delete a workspace, all its tasks are automatically deleted too — no orphaned data.

3- @id tells PostgreSQL "this is the primary key — the unique identifier for every row." , cuid() is a function that auto-generates IDs like clx9abc2d0001lm7k...
so final - id String @id @default(cuid()) // ✅ Primary key with auto-generated ID

4-Prisma relations need two things: (Relation goes on a virtual field, not the ID column)
i)-The raw foreign key column (just a String storing the ID)
ii)-A virtual relation field (Prisma uses this to create joins)

    ### The Pattern to Remember

Every Prisma relation follows this exact pattern:

```
Child has:    parentId String              ← the real DB column
              parent   Parent @relation()  ← the virtual join field

Parent has:   children Child[]             ← the reverse side
```

5-To migrate a db use this command
cd packages/db
npx prisma migrate dev --name add_all_content_and_activity_tables

6-1. How to identify one-to-many vs many-to-many by syntax
One-to-many — you see a foreign key field on the child:
prisma// Task belongs to ONE workspace
workspaceId String // ← real column in DB
workspace Workspace @relation(fields: [workspaceId], references: [id])

// Workspace has MANY tasks
tasks Task[]

7-Many-to-many — you see arrays on BOTH sides, no foreign key field anywhere:
prisma// Task has MANY tags
tags Tag[]

// Tag has MANY tasks
tasks Task[]

8-Pattern: both sides have ModelName[]. No fieldId, no @relation(fields: [...]). Prisma sees this and automatically creates a hidden join table.
Quick cheat sheet:

See fieldId String + @relation(fields: ...) → one-to-many
See [] on both sides, no FK field → many-to-many

9-9:58 AMdev tells Prisma which mode to run the migration in. Prisma has two migration commands:
prisma migrate dev — Development mode. It generates the SQL migration file, applies it to your database, AND re-runs prisma generate to update the client. If there are conflicts, it'll offer to reset the database. Only use this locally.
prisma migrate deploy — Production mode. It ONLY applies existing migration files that haven't been run yet. No generating, no resetting, no prompts. You run this when deploying to Railway/Vercel where your production database lives.
Think of it like git: migrate dev is like working on a branch and committing freely. migrate deploy is like pushing to main — it only applies what's already been committed.
For now, you'll always use migrate dev. You won't touch deploy until Week 10+ when you're deploying to production.

10-In any component, you can do:
tsx"use client";
import { useSession } from "next-auth/react";

export function Header() {
const { data: session, status } = useSession();

if (status === "loading") return <p>Loading...</p>;
if (!session) return <p>Not logged in</p>;

return <p>Hello, {session.user.name}!</p>; // "Hello, Pradyum!"
}
useSession() is basically asking: "Is there a valid cookie right now? If yes, what's inside it?"
status can be three things:

"loading" — still checking the cookie
"authenticated" — cookie found, user is logged in, session has the data
"unauthenticated" — no cookie, user needs to log in

What Each File Does — Simplified
FilePlain Englishauth.ts"Here's how to verify Telegram logins and what data to put in the cookie"[...nextauth]/route.ts"NextAuth, please handle all requests to /api/auth/\*"session-provider.tsx"Wrap the app so every component can call useSession()"telegram-login.tsx"Load Telegram's button and when clicked, send the data to NextAuth"

11- tRPC = function call over network

1. router (router = backend ka controller)
   export const userRouter = router({
   getUser: publicProcedure.query(() => {})
   });
2. procedure (procedure = actual endpoint)
   publicProcedure.query()
   publicProcedure.mutation()
   query → read
   mutation → write
3. client (frontend caller)
   api.user.getUser.useQuery()
4. provider (React ko connect karta)
   <TRPCProvider>
   {children}
   </TRPCProvider>

   12-Before writing any query, ask these questions in order:

5. Security first — who owns this data?
   Always start your where clause with ownership. Before any other filter:
   tswhere: { workspace: { userId: ctx.session.user.id } }
   If you forget this, any user can access any data. Make it a reflex.
6. What do I actually need back?

A single record → findFirst / findUnique
A list of records → findMany
Just a number → count
Aggregated/grouped data → groupBy
Does the DB exist? → findFirst + throw if null

The mistake you made was reaching for findFirst + JS filtering when the data was already aggregated — that's a sign you need groupBy or count. 3. Should the DB do this or should JS do this?
Rule of thumb:

If you're about to write .filter(), .map(), or .reduce() on query results — stop. Can the DB do this instead?

DB is always faster for filtering, counting, grouping. JS filtering is fine for small transformations on already-fetched data. 4. What's the minimum data I need?
Don't fetch entire rows when you only need counts or specific fields. Use select or \_count:
tsselect: { id: true, title: true } // not include: { everything: true }

```

**5. What shape do I want back?**
Think about what the frontend needs before writing the query. Work backwards from the UI.

---

## The mental checklist (paste this somewhere):
```

1. Auth — is userId in the where clause?
2. Operation — findFirst / findMany / count / groupBy?
3. Filtering — DB or JS? (prefer DB)
4. Data — minimum fields needed (select)?
5. Shape — what does the frontend actually need?
