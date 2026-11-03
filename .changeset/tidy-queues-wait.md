---
"effect": patch
---

Fix SQL-backed `PersistedQueue` jobs retrying up to a second early on SQLite and MySQL, and remove an extra second of delay from delayed offers on SQLite.
