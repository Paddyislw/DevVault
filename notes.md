1 - upsert -> create if doesn't exist, skip if it does (It's safe to run multiple times.)
2 - Cascade means if you delete a workspace, all its tasks are automatically deleted too — no orphaned data.