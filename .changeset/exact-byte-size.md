---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Add an exact branded-bigint `ByteSize` value module with unambiguous decimal (`kB`, `MB`) and binary (`KiB`, `MiB`) units, parsing, formatting, checked arithmetic, and safe number conversion. Add `Schema.ByteSize*` codecs and `Config.ByteSize` for exact non-negative byte counts.

Migrate logical file-system sizes and byte ranges to exact `ByteSize` values. Filesystem stream ranges, path-backed HTTP file ranges, multipart limit options, and Node stream collection limits accept `ByteSize.Input`. Native number-backed inputs, including truncation lengths, Web `File` ranges, in-memory allocation sizes, and chunk sizes, continue to use `number`; `File.read` and `File.write` also return numeric byte counts. `File.seek` accepts and returns signed `bigint` positions and retains its infallible effect type.

Path-backed `HttpPlatform.fileResponse` and `HttpServerResponse.file` accept `ByteSize.Input` for `offset` and `bytesToRead`, such as `ByteSize.bytes(100)`. Their Web-file counterparts, `fileWebResponse` and `fileWeb`, retain `number` ranges, such as `100`, because native `File`/`Blob` slicing uses numbers. Both forms retain numeric `chunkSize`.

Direct multipart reference values must be normalized: `Multipart.MaxFieldSize` stores `ByteSize.ByteSize`, and `Multipart.MaxFileSize` stores `ByteSize.ByteSize | undefined`. For example, use `Effect.provideService(Multipart.MaxFieldSize, ByteSize.bytes(100))` instead of providing `100` directly. Use `undefined` for no explicit per-file limit. `Multipart.limitsServices` still accepts `ByteSize.Input` size options and normalizes them; the corresponding fields in `Multipart.withLimits.Options` also use `ByteSize.Input`.

Native filesystem operations and HTTP range calculations retain their existing behavior. Static ranges above `Number.MAX_SAFE_INTEGER` still fall back to a full `200` response. Numeric `ByteSize.Input` values must be non-negative safe integers. Unsafe finite numeric limits, such as `1e20`, are now rejected, including by low-level `MultipartParser.make` configuration and Node stream collection limits. These two APIs continue to accept `Infinity` as the no-limit sentinel.

The old `FileSystem.Size`, `SizeInput`, `KiB`, `MiB`, `GiB`, `TiB`, and `PiB` exports have been removed. Use `ByteSize` values or inputs instead.
