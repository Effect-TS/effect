---
"@effect/platform-deno": patch
---

Require Deno 2.9.3 or newer. Deno 2.8.3 to 2.9.2 panic and exit when an HTTP/2 client cancels a request while its `DenoHttpServer` handler is still running (denoland/deno#36053), which browsers do when a tab closes or navigates away mid-request.
