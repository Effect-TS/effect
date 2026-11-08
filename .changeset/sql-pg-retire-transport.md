---
"@effect/sql-pg": patch
---

Fix `PgConnection.make` retaining sockets after scope release when the peer withholds its closing FIN.
