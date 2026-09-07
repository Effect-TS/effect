---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Add an exact branded-bigint `ByteSize` value module with unambiguous decimal (`kB`, `MB`) and binary (`KiB`, `MiB`) units, parsing, formatting, checked arithmetic, and safe number conversion. Add `Schema.ByteSize*` codecs and `Config.ByteSize` for exact non-negative byte counts.

Migrate logical file-system sizes and byte ranges to exact `ByteSize` values. File sizes, filesystem stream ranges, path-backed HTTP file ranges, multipart limits, and Node stream collection limits accept `ByteSize.Input`. Native number-backed inputs, including truncation lengths, Web `File` ranges, in-memory allocation sizes, and chunk sizes, continue to use `number`; `File.read` and `File.write` also return numeric byte counts. `File.seek` accepts and returns signed `bigint` positions and retains its infallible effect type.

Native filesystem calls, HTTP range handling, and error behavior are preserved. Static ranges above `Number.MAX_SAFE_INTEGER` still fall back to a full `200` response. Multipart and Node stream collection limits continue to accept `Infinity` as the no-limit sentinel.

The old `FileSystem.Size`, `SizeInput`, `KiB`, `MiB`, `GiB`, `TiB`, and `PiB` exports have been removed. Use `ByteSize` values or inputs instead.
