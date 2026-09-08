---
"effect": patch
---

Preserve sub-second MySQL and SQLite persisted queue retry delays. MySQL uses microsecond timestamps and intervals; SQLite uses millisecond timestamps and rounds delays up to its clock precision while retaining compatibility with existing rows.

Existing MySQL queue timestamp columns are migrated to DATETIME(6) at store startup. This can rebuild the table and hold locks that block writes for the duration, so plan startup accordingly for large queues. Startup now fails with a diagnostic if a previously recorded migration left timestamp columns without the required precision; repair those columns before restarting the store.
