---
"@effect/platform": patch
"@effect/platform-browser": patch
"@effect/platform-node": patch
"@effect/experimental": patch
---

Fix `HttpIncomingMessage.arrayBuffer` in `@effect/platform-node` returning a `Uint8Array` instead of an `ArrayBuffer`, and support building under TypeScript 5.9
