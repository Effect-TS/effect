---
"effect": patch
---

Drain OTLP export response bodies on success and failure, including before retries. This avoids deferred cleanup aborting workerd Durable Objects outside their originating IoContext (cloudflare/workerd#7517).
