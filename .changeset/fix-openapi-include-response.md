---
"@effect/openapi-generator": patch
---

Fix generated HTTP client success types for dynamic and optional `includeResponse` options. Both `httpclient` formats now return a union of the body and response tuple when the flag may be true, while omitted configuration still returns only the body type.
