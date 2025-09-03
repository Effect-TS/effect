---
"@effect/sql-sqlite-bun": minor
---

Add prepared-statement cache and clear it after `loadExtension` to ensure extension-dependent queries are re-prepared with up-to-date functions and planning.
