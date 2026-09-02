---
"effect": patch
---

Fix `RequestResolver.withCache` retaining abandoned entries when a pending request is cancelled, which could cause later equal requests to hang. Results containing interruptions are no longer cached; completed successes and other failures remain cached, and cancelling one caller does not interrupt requests shared with other callers.
