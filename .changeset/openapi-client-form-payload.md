---
"@effect/openapi-generator": patch
---

When an endpoint accepted both multipart and URL-encoded forms, generated HTTP clients sent a multipart request but required callers to supply the fields from the URL-encoded schema. Both client formats now use the multipart schema for the payload argument, so TypeScript checks the fields the client sends.
