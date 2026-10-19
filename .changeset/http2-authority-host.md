---
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Use HTTP/2 authority for the exposed `host` header and request URL, even when Host is missing or conflicting. In Deno, also use the target authority for HTTP/1.1 absolute-form requests.
