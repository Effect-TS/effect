---
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform": patch
"effect": patch
---

Add `{ once: true }` to all `"abort"` event listeners for `AbortController` to automatically remove handlers after execution
