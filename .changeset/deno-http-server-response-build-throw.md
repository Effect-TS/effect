---
"@effect/platform-deno": patch
---

Fix `DenoHttpServer` leaving a request unanswered when the web `Response` can't be built, for example for a status outside 200–599 or an invalid header value. The server now answers a 500, cancels the response body, and still reports the failure.
