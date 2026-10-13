---
"@effect/sql-pg": patch
---

Reject queries, streams and listeners on released `PgConnection` pins, and ignore their `interrupt` calls. Close the session if a pin is released with an in-flight statement or an open listener, so neither can affect the next borrower.
