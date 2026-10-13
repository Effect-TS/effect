---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
---

Add `Path.resolveWithin(root, input)`, which resolves a relative path beneath a root and returns `Option.none()` for traversal escapes and rooted inputs, using the platform's path rules. Add `Path.make` to build a `Path` service with `resolveWithin` derived from the other operations; custom `Path` implementations must now provide `resolveWithin`, most simply by wrapping them in `Path.make`. `HttpStaticServer` now uses `resolveWithin` for its root containment check.
