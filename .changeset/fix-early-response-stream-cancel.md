---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Close the request scope when a streaming HTTP response body is cancelled before its first pull in Bun and Deno servers, preventing request resources from leaking.
