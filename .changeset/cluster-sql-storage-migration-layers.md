---
"effect": minor
---

Add `layerMigrations` and DDL-free `layerStorage` to `SqlMessageStorage` and `SqlRunnerStorage`, allowing migrations to run with an owner connection separately from a DML-only runtime. Existing constructors and layers still migrate on startup. Migration-only layers return typed migration errors.

Add `Migrator.pending` and storage migration loaders for read-only migration checks. Fix PostgreSQL history-table lookup for quoted names and message migrations retrying forever after a SQL error.

Runner storage now records migrations in `<prefix>_runner_migrations` and creates the locks table regardless of advisory lock settings. On upgrade, default layers create `cluster_runner_migrations` and lock it during PostgreSQL startup migrations. Existing runner and lock tables are preserved.
