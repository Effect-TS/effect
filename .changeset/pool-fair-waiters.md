---
"effect": patch
---

Fix `Pool` waiters starving under contention. Capacity freed by a release, an ended reservation, a new acquisition or a strategy reclaim now goes to the longest-waiting borrower instead of a borrower that arrives later.
