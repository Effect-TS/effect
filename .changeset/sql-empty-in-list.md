---
"effect": patch
---

Fix `IN ${sql.in([])}` compiling to `IN ()`. Empty lists now match no rows with `IN` and every row with `NOT IN` on all dialects. On PostgreSQL this compiles to `= ANY('{}')` / `<> ALL('{}')`, which does not support array-typed columns.
