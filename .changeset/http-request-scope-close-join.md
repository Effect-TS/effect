---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Close a request scope transferred to a streamed body only after both the request and the body have finished, so middleware and tracing complete before request finalizers run.
