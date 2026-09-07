---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
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
silently discarded. On filesystems with inode values above the safe integer limit,
stat and HTTP file serving can fail even for small files.

HTTP file responses retain exact bigint content lengths, allowing whole files
above the safe integer limit to stream with exact decimal `Content-Length`
headers. The `HttpPlatform.make` callback now receives a bigint `contentLength`.
Offsets and range ends use checked numeric conversions for runtime APIs such as
Node `createReadStream`, Bun `file.slice`, and Deno's bounded byte stream. Invalid
or unsafe numeric range inputs fail with `BadArgument` instead of defects.

`HttpStaticServer` preserves exact file sizes in range arithmetic and
`Content-Range` totals, including suffix, open-ended, and unsatisfiable ranges.
