---
"effect": patch
---

Fix cluster SqlMessageStorage emitting an invalid `FOR UPDATE` clause on SQL Server, which caused every unprocessed-message read to fail with a syntax error.
