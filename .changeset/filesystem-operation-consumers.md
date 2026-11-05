---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

`HttpPlatform.layer`, `HttpPlatform.make`, `HttpStaticServer`, `HttpBody.file`, `HttpClientRequest.bodyFile` and `Logger.toFile` now require only the `FileSystem` operations they call (such as `"effect/FileSystem/stat"` or `"effect/FileSystem/open"`), so providing those operations' layers is enough, and the Node and Bun `HttpPlatform` layers no longer bundle the whole file system.
