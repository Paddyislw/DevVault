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
