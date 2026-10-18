---
"effect": patch
---

Fix `Stream.toReadableStream` to wait for Web Stream demand before pulling the next upstream chunk, avoiding premature upstream side effects.
