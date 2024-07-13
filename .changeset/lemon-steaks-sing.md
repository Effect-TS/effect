---
"effect": patch
---

if performance.timeOrigin is 0, use performance.now() directly in Clock

This is a workaround for cloudflare, where performance.now() cannot be used in
the global scope to calculate the origin.
