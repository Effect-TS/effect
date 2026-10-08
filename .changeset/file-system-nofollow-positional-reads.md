---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add a `noFollow` option to `FileSystem.open` and an optional `position` to `File.read` and `File.readAlloc`.

`noFollow` refuses to open a symbolic link at the final path component. Node and Bun support it on POSIX systems; Windows and Deno fail with `BadArgument` instead of silently following the link. Positional reads leave the file cursor unchanged and can run concurrently on one handle.
