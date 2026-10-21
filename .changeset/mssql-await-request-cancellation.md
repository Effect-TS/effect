---
"@effect/sql-mssql": patch
---

Wait for Tedious to finish canceling an interrupted statement or procedure call before the connection is released, so the next request on that connection no longer fails with "Requests can only be made in the LoggedIn state, not the SentClientRequest state".
