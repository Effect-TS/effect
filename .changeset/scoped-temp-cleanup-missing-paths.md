---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Allow `FileSystem.makeTempDirectoryScoped` and `FileSystem.makeTempFileScoped` to finalize successfully when their temporary path has already been removed.
