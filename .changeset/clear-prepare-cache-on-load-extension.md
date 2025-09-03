---
"@effect/sql-sqlite-node": patch
---

Invalidate the prepared-statement cache after `loadExtension`.

Prepared statements created before loading a SQLite extension could fail even
after the extension was loaded (e.g. "no such function" for extension
functions) because they were reused from the prepare cache. Clearing the cache
after `db.loadExtension` ensures statements are re-prepared with the updated
function set and query plan.

Also adds tests that verify extension functions fail before load and succeed
after, including the same SQL text succeeding post-load.

