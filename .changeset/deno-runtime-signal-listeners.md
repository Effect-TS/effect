---
"@effect/platform-deno": patch
---

Keep `DenoRuntime.runMain` signal listeners installed until the main fiber exits, so repeated `SIGINT` or `SIGTERM` signals no longer skip shutdown finalizers.
