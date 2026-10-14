---
"effect": minor
"@effect/sql-sqlite-react-native": minor
---

Move `fromFileSystem` to `effect/sql/MigratorFileSystem`. A dynamic import in `effect/sql/Migrator` made Metro fail the whole module, so React Native could not import `fromRecord`. The `effect/sql` barrel and the React Native migrator do not re-export the filesystem loader.
