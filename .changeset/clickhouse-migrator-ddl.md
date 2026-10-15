---
"effect": patch
---

Fix the ClickHouse migrator creating its ledger with SQLite syntax and wrapping the run in `BEGIN TRANSACTION`.
