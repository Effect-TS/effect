---
"effect": patch
---

Preserve sub-second retry delays in the SQL persisted queue store. Retry deadlines were rounded up to whole seconds, and MySQL and SQLite compared them against whole-second clocks, so a 500 ms retry could be redelivered within a few milliseconds of failing.

MySQL now stores queue timestamps as `DATETIME(6)`. Existing tables are altered at store startup, which can rebuild the table and block writes for the duration on large queues.

SQLite now stores `visible_at`, `acquired_at`, `created_at` and `updated_at` as `YYYY-MM-DD HH:MM:SS.mmm`. Existing whole-second rows keep working without a migration. Rolling back to an older version reads the new rows up to one second late, never early.
