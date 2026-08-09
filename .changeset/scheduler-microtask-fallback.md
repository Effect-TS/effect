---
"effect": patch
---

Fall back to `Promise.resolve().then` for scheduler microtask dispatch when the `queueMicrotask` global is missing, so sync-mode scheduling works in environments (e.g. Convex isolates) that support Promises but do not install `queueMicrotask`.
