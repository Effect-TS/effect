---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add experimental `Glob` path matching and a shared `FileSystem.glob` implementation for Node, Bun, and Deno.

- Results use `/` separators and are relative to `root` unless the pattern is absolute. Deno no longer always returns absolute paths; Node on Windows no longer returns backslash separators.
- Patterns use `/` separators and backslash escapes. Wildcards skip dotfiles unless explicitly named or `dot: true`. `**` does not traverse symlinks. Extglobs are not interpreted, though ordinary wildcards within them still apply. UNC patterns and paths never match.
- Add `FileSystem.readDirectoryEntries` and `DirectoryEntry`. `FileSystem.make` derives the listing from `readDirectory` with `"Unknown"` types and supplies `glob` when omitted. Implementations bypassing `make` must add the method; wrappers must apply `readDirectory` changes to it too.
- Missing paths return `[]`. Read failures at the root or a leading literal directory propagate; unreadable wildcard-reached directories are skipped. On Deno, the latter no longer fail the whole glob. Leading literals are probed without listing their parent, allowing `src/**` with `--allow-read=./src`.
