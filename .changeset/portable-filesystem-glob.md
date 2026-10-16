---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add the `Glob` module for matching paths against glob patterns, and make `FileSystem.glob` return the same results on Node, Bun, and Deno. `FileSystem.make` derives `glob` from `readDirectory`, `stat`, and `readLink` when it is omitted, and the Node and Deno file systems now use it instead of their native glob.

- Results are `/`-separated paths relative to `root`. Deno previously returned absolute paths, and Node on Windows returned `\`-separated ones.
- Patterns use `/` as the separator and `\` as an escape. Wildcards and `**` skip dotfiles unless `dot: true` is passed, `**` does not traverse symbolic links, extended globs such as `!(a)` match literally, and UNC patterns such as `//server/share` match nothing.
- `FileSystem.make` accepts an optional `readDirectoryEntries` returning `FileSystem.DirectoryEntry` values. The Node and Deno file systems provide it so `glob` reads entry types from the listing instead of calling `stat` on each entry.
