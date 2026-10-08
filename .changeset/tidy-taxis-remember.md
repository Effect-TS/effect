---
"effect": patch
---

Make `HttpClient.withRateLimiter` wait for the reported reset once a response's remaining budget is exhausted, including when a limit header is also present.
