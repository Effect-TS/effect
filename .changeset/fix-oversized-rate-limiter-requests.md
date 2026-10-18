---
"effect": patch
---

Fix rate limiter delay mode to charge oversized token requests against the shared store, preserving queue ordering and delay/reset timing for fixed-window and token-bucket limits.
