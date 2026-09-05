---
"effect": patch
---

Allow generated `HttpApiClient` methods and `AtomHttpApi` queries and mutations to accept native SSE decode options per call through the request's `sseOptions` field. The field is available only when an endpoint has an SSE success variant, including mixed responses and `WithHeaders`.
