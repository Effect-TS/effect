---
"effect": patch
---

Fix `IN ${sql.in([])}` compiling to the invalid `IN ()`. An empty list now matches no rows with `IN` and every row with `NOT IN`, when the keyword directly precedes the helper. On PostgreSQL, array-typed columns are not supported, and a comparison on the left of `IN` must be parenthesized: `a = (b IN ${sql.in([])})`.
