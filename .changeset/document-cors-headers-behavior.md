---
"@effect/platform": patch
---

Document subtle CORS middleware `allowedHeaders` behavior: when empty array (default), it reflects back the client's `Access-Control-Request-Headers` (permissive), and when non-empty array, it only allows specified headers (restrictive). Added comprehensive JSDoc with examples.
