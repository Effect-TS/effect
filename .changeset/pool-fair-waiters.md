---
"effect": patch
---

Fix `Pool` waiters starving under contention. Capacity from a released, reserved, newly acquired or reclaimed item now goes to the longest-waiting borrower instead of a borrower that arrives later.
