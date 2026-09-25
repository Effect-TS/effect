---
"effect": patch
---

Drain OTLP export response bodies on success and HTTP errors before retries. This prevents deferred cleanup from aborting workerd Durable Objects outside their originating IoContext (cloudflare/workerd#7517).
