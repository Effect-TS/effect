---
"effect": patch
---

Fix `Pool` waiters starving under contention. A released item is now handed to the longest-waiting borrower instead of being taken by a borrower that arrives later.
