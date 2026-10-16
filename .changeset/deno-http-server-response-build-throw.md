---
"@effect/platform-deno": patch
---

Fix `DenoHttpServer` leaving requests unanswered when the web `Response` can't be built, such as for a rejected status or invalid header value. It now responds with a 500, cancels the unused body and reports the original failure.
