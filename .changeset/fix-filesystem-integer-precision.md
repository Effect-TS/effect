---
"@effect/platform-node-shared": patch
"effect": patch
---

Prevent silent precision loss in filesystem writes, stats, and HTTP file responses.

Node-compatible filesystem writes now fail with `PlatformError` / `BadArgument`
when the write position exceeds the safe integer range. Callback-based `fs.write`
does not honor bigint positions on supported Node versions, so safe positions
continue to use numbers. Append writes do not use the seek position.

`stat` and open-file `stat` request bigint stats, preserving `size` and `blksize`
exactly. Metadata exposed as numbers (`dev`, `ino`, `rdev`, `mode`, `nlink`, `uid`,
`gid`, and `blocks`) must fit the safe integer range. An unsafe value fails the
whole stat operation with `BadArgument`; optional fields are not rounded or
silently discarded.

HTTP file responses calculate offsets, range ends, and content lengths with bigint
arithmetic and fail with `BadArgument` if conversion to the runtime's numeric
arguments would be unsafe. This includes Node `createReadStream` and Bun
`file.slice` ranges.
