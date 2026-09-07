---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Migrate filesystem sizes and byte limits to `ByteSize`.

- Replace `FileSystem.Size` and `SizeInput` with `ByteSize.ByteSize` and `ByteSize.Input`. Replace unit helpers such as `FileSystem.MiB` with `ByteSize.mebibytes`.
- Filesystem stream ranges, multipart size options, and Node stream limits accept `ByteSize.Input`.
- Path-backed `HttpPlatform.fileResponse` and `HttpServerResponse.file` ranges accept `ByteSize.Input`. Web-file ranges (`fileWebResponse` and `fileWeb`) use `number`, matching native `File`/`Blob` slicing.
- Allocation sizes, chunk sizes, truncation lengths, and read/write counts use `number`. `File.seek` accepts and returns signed `bigint` positions and remains infallible.
- `Multipart.MaxFieldSize` and `MaxFileSize` require normalized values, such as `ByteSize.bytes(100)`, when provided directly. `MaxFileSize` also accepts `undefined` for no limit. `Multipart.limitsServices` accepts and normalizes `ByteSize.Input` size options.
- Numeric byte-size inputs must be non-negative safe integers. Unsafe finite limits such as `1e20` are rejected; low-level `MultipartParser.make` size limits and Node stream collection limits still accept `Infinity` for no limit.
