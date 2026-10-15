---
"effect": patch
---

Preserve fractional token counts in the Redis fixed-window rate limiter so remaining capacity, excess-request rejection, and delay reservations are calculated correctly.
