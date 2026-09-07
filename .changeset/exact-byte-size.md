---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Replace `FileSystem.Size`, `SizeInput`, and unit helpers with `ByteSize` equivalents (for example, `MiB` becomes `ByteSize.mebibytes`). File sizes use `ByteSize.ByteSize`; filesystem and path-backed HTTP ranges, multipart size options, and Node stream limits accept `ByteSize.Input`.

Allocation sizes, chunk sizes, truncation lengths, and read/write counts use `number`. Web-file ranges also use `number`, matching native `File.slice`. `File.seek` uses signed `bigint`.

Provide normalized `ByteSize` values to `Multipart.MaxFieldSize` and `MaxFileSize`; `undefined` disables the file limit. `Multipart.limitsServices` normalizes size inputs.

Numeric byte-size inputs must be non-negative safe integers; unsafe finite limits are rejected. Low-level `MultipartParser.make` size limits and Node stream collection still accept `Infinity` for no limit.
