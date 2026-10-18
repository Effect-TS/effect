---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
---

Add experimental `Glob` path matching and a shared `FileSystem.glob` implementation for Node, Bun, and Deno.

- Breaking: custom `FileSystem` implementations, including inputs to `FileSystem.make`, must provide `readDirectoryEntries`; mapping `readDirectory` names to `{ name, type: "Unknown" }` is supported. Wrappers must apply directory-listing changes to both methods.
- `FileSystem.make` now derives `glob` instead of accepting it. Apply custom overrides afterward with `FileSystem.of({ ...fs, glob: customGlob })`.
- Glob patterns use `/` separators and backslash escapes; Node extglobs no longer expand. Results use `/` separators and are relative to `root` unless the pattern is absolute. Deno wildcards now skip dotfiles unless explicitly named or `dot: true`; unreadable wildcard-reached directories are skipped, while read failures at the root or a leading literal directory propagate.
