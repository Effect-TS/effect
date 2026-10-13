---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add `Path.resolveWithin(root, input)`, which resolves a relative path beneath a root and returns `Option.none()` for traversal escapes and rooted inputs, using the platform's path rules.
