---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add the `Glob` module for matching paths against glob patterns, and make `FileSystem.glob` return the same results on Node, Bun, and Deno. `FileSystem.make` derives `glob` from `readDirectory`, `stat`, and `readLink` when it is omitted, and the Node and Deno file systems now use it instead of their native glob.

- Results are `/`-separated paths relative to `root` (absolute for absolute patterns). Deno previously always returned absolute paths, and Node on Windows returned `\`-separated ones.
- Patterns use `/` as the separator and `\` as an escape. Wildcards and `**` skip dotfiles unless `dot: true` is passed, `**` does not traverse symbolic links, extended glob syntax is not interpreted (ordinary wildcards still apply), and UNC patterns such as `//server/share` match nothing.
- `FileSystem` gains `readDirectoryEntries`, which lists a directory as `FileSystem.DirectoryEntry` values with each entry's own type. `FileSystem.make` derives it from `readDirectory` with `"Unknown"` types when it is omitted, and the Node and Deno file systems implement it so `glob` reads entry types from the listing instead of calling `stat` on each entry. Implementations that do not use `FileSystem.make` must add it, and wrappers that change `readDirectory` must change it too.
- `glob` fails when the root, or a directory named by the pattern's leading literal segments, cannot be read, and returns `[]` when it does not exist. Unreadable directories reached through wildcards are skipped. Leading literal segments are checked with `stat` instead of listing their parent, so Deno with `--allow-read` limited to `./src` can glob `src/**`. On Deno, missing read permission for the root or a named directory is still reported as a `PermissionDenied` error, as `expandGlob` did, but unreadable directories reached through wildcards no longer fail the whole glob.
