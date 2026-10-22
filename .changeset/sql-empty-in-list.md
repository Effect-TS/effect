---
"effect": patch
---

Compile an empty `sql.in` list as an empty subquery so `IN ()` is not sent to the database.
