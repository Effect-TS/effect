---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add a `noFollow` option to `FileSystem.open` to reject symlinks at the final path component. Supported on Node and Bun on POSIX; Windows and Deno return `BadArgument`. Add `{ position }` to `File.read` and `File.readAlloc` for concurrent reads that leave the cursor unchanged.
