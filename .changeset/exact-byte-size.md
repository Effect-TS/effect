---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Migrate logical file-system sizes and byte ranges to exact `ByteSize` values. File sizes, filesystem stream ranges, path-backed HTTP file ranges, multipart limits, and Node stream collection limits accept `ByteSize.Input`. Native number-backed inputs, including truncation lengths, Web `File` ranges, in-memory allocation sizes, and chunk sizes, continue to use `number`; `File.read` and `File.write` also return numeric byte counts. `File.seek` accepts signed `bigint` offsets and fails with `PlatformError` when the resulting position would be negative.

Static file range requests above `Number.MAX_SAFE_INTEGER` are now parsed exactly and return `416 Range Not Satisfiable` when they start beyond the end of the file, instead of falling back to a full `200` response. Multipart limit options continue to accept `Infinity` as the no-limit sentinel.

The old `FileSystem.Size`, `SizeInput`, `KiB`, `MiB`, `GiB`, `TiB`, and `PiB` exports have been removed. Use `ByteSize` values or inputs instead.
