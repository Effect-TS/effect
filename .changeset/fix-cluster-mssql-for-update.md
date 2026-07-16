---
"effect": patch
---

Fix SQL Server support in cluster SqlMessageStorage.

The mssql code paths contained failures across core storage paths:

- The unprocessed-message reads emitted a trailing `FOR UPDATE` clause, which T-SQL only allows on cursors, so the reads failed with a syntax error. The mssql dialect now omits the clause (as sqlite does) without adding an `UPDLOCK` hint, so concurrent duplicate observation stays within the existing at-least-once delivery contract.
- The messages and replies tables declared plain `UNIQUE` constraints on `message_id`, `(request_id, kind)` and `(request_id, sequence)`. SQL Server treats NULLs as equal in unique constraints, so the second message without a primary key — and the second chunk reply of any stream — failed with a unique violation. The constraints are replaced with filtered unique indexes (`WHERE ... IS NOT NULL`), matching the NULL-exempt semantics of the other dialects.
- The `insertEnvelope` MERGE statement used subqueries in its `OUTPUT` clause, which SQL Server rejects (error 10705), so saving a request with a primary key always failed — and its duplicate-detection logic was wrong besides, since a MERGE with only `WHEN NOT MATCHED` emits no OUTPUT row for an existing key.
- The `payload` and `headers` columns were declared as the deprecated `TEXT` type. The mssql client binds NULL parameters as `BIT`, which has no implicit conversion to `TEXT`, so inserting envelopes with NULL payloads (e.g. `AckChunk`) failed with an operand type clash. The columns are now `NVARCHAR(MAX)`.

A new `0003_mssql_schema_fixes` migration converges existing SQL Server databases (a no-op on other dialects): it drops the anonymous and named unique constraints, creates the filtered unique indexes, and alters the `TEXT` columns to `NVARCHAR(MAX)` in place, preserving existing data.
