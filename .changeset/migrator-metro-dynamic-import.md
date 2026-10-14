---
"effect": minor
"@effect/sql-sqlite-react-native": minor
---

Move `fromFileSystem` from `effect/sql/Migrator` to `effect/sql/MigratorFileSystem`, so React Native apps can import `effect/sql/Migrator` and `effect/sql` under Metro. The `effect/sql` barrel and `@effect/sql-sqlite-react-native/SqliteMigrator` no longer export `fromFileSystem`; the other SQL adapter migrators still re-export it.
