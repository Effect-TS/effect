---
"effect": minor
---

Allow cluster SQL storage to run without DDL at runtime.

`SqlMessageStorage` and `SqlRunnerStorage` now export `layerMigrations`, which only runs the migrations, and `layerStorage`, which builds the storage without issuing DDL. Run `layerMigrations` with a connection that can create tables, for example in a deploy step, and use `layerStorage` with a connection that can only read and write rows. `layer`, `layerWith`, `make`, and `makeEncoded` still run the migrations first.

Add `Migrator.pending`, which lists the migrations that have not been applied without creating or locking the migrations table. Use it with the new `SqlMessageStorage.migrations` and `SqlRunnerStorage.migrations` loaders to check that the cluster tables are migrated.

`SqlRunnerStorage` now uses a migrator, recorded in `<prefix>_runner_migrations`. On upgrade, the default layers create `cluster_runner_migrations` and, on PostgreSQL, lock it while the migrations run at startup. The first migration keeps existing `cluster_runners` and `cluster_locks` tables. The locks table is now created on every dialect, whether or not advisory locks are disabled.
