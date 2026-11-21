---
"effect": patch
---

Fix `sql.insert`, `sql.update` and `sql.updateValues` silently binding `NULL` for a field whose value is an SQL expression fragment, such as `sql.literal("CURRENT_TIMESTAMP")`, and binding only the leading parameter of a fragment with more SQL after it; these fields now throw an error naming the column.
