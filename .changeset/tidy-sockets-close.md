---
"@effect/sql-pg": patch
---

Wait for `PgConnection.make` scopes to close driver-created sockets before release completes.
