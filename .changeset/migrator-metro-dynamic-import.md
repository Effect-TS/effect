---
"effect": minor
"@effect/sql-sqlite-react-native": minor
---

Move `fromFileSystem` to `effect/sql/MigratorFileSystem`. A dynamic import in `effect/sql/Migrator` made Metro fail the whole module, so React Native could not import `fromRecord`. The React Native migrator no longer re-exports the filesystem loader.
