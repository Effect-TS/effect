---
"@effect/sql-mssql": patch
---

Replace pooled MSSQL connections on driver `end` as well as `error`, and install error handling before connecting so early driver errors cannot crash the process.
