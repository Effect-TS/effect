---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Migrate file-system sizes and byte counts to exact `ByteSize` values. Byte-count inputs, stream limits, HTTP file ranges, multipart limits, and Node stream collection limits accept `ByteSize.Input`. `File.seek` accepts signed `bigint` offsets and fails with `PlatformError` when the resulting position would be negative.

The old `FileSystem.Size`, `SizeInput`, `KiB`, `MiB`, `GiB`, `TiB`, and `PiB` exports have been removed. Use `ByteSize` values or inputs instead.
