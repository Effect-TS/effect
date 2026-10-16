---
"effect": patch
"@effect/platform-browser": patch
---

Start stream and channel callback registration effects before the first pull, preventing lost early events during synchronous listener setup without awaiting asynchronous registration. Keep browser HTTP response stream listeners installed until the stream is finalized.
