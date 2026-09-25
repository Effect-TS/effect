---
"effect": patch
---

`OtlpExporter` now reads the body of every export response, success or failure, so no response is left in `HttpClient`'s `FinalizationRegistry`. On workerd, a registry abort that fires during another request settled the exporting Durable Object's promise from outside its IoContext and aborted the idle object (cloudflare/workerd#7517).
