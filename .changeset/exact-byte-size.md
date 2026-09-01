---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Migrate logical file-system sizes and byte ranges to exact `ByteSize` values. File sizes, filesystem stream ranges, path-backed HTTP file ranges, multipart limits, and Node stream collection limits accept `ByteSize.Input`. Native number-backed inputs, including truncation lengths, Web `File` ranges, in-memory allocation sizes, and chunk sizes, continue to use `number`; `File.read` and `File.write` also return numeric byte counts. `File.seek` accepts signed `bigint` offsets and fails with `PlatformError` when the resulting position would be negative.

The old `FileSystem.Size`, `SizeInput`, `KiB`, `MiB`, `GiB`, `TiB`, and `PiB` exports have been removed. Use `ByteSize` values or inputs instead.
