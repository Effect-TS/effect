---
"effect": patch
---

Fix fail-mode fixed-window `RateLimiter` checks admitting more than `limit` requests per `window` and reporting a shortened `resetAfter`.
