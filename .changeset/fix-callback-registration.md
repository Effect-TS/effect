---
"effect": patch
"@effect/platform-browser": patch
---

Start `Stream.callback` and `Channel.callback` registration before the first pull, so synchronous listener setup no longer misses early events. Browser HTTP response stream listeners now stay installed until the stream is finalized.
