---
"effect": patch
---

Drain OTLP export response bodies before completing or retrying each request. This keeps connections reusable and prevents deferred cleanup from aborting workerd Durable Objects outside their originating IoContext (cloudflare/workerd#7517).
