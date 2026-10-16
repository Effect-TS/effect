---
"@effect/platform-browser": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Keep the thrown error as the cause when a Browser or Deno worker runner receives an `error` event, and fix the grammar of the `messageerror` failure message.
