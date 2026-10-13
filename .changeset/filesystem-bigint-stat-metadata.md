---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
---

Use `bigint` for 64-bit `FileSystem.File.Info` metadata. `dev` is now a `bigint`, and `ino`, `rdev`, `nlink`, and `blocks` are `Option<bigint>`, so file stats no longer fail or drop values outside the safe integer range. Node and Bun read `dev`, `ino`, `rdev`, and `nlink` as unsigned 64-bit integers. Deno reports these fields as numbers, so values above `Number.MAX_SAFE_INTEGER` are rounded by Deno before conversion.
