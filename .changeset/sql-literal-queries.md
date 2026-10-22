---
"effect": minor
---

Add experimental `SqlClient.makeQuery` for single-table SQLite `SELECT` string literals, inferring result fields and named parameter types from imported JSON schema snapshots and binding parameter values. Add `Migrator.runWithSnapshot` to run migrations and refresh snapshots for SQLite `STRICT` tables with ordinary `INT`, `INTEGER`, `REAL`, and `TEXT` columns.
