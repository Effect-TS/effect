---
"effect": patch
---

Fix `Pool` waiters starving under contention. Capacity from a released item, an ended reservation or a newly acquired item now goes to the longest-waiting borrower instead of a borrower that arrives later.
