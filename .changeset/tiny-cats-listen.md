---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"effect": patch
---

Add `FileSystem.lstat`, which returns the `File.Info` of a path without following symbolic links. Custom `FileSystem` implementations, including those passed to `FileSystem.make`, must now provide `lstat`.
