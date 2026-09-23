---
"effect": patch
---

Fix `TxRef` losing a write of `-0` over `0`, and stop rerunning waiting transactions when a commit only reads their refs.
