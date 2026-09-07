---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Reject file seeks before the start of the file on Node and Deno with a `PlatformError` whose reason is `BadArgument`, module is `FileSystem`, and method is `seek`. Failed seeks leave the cursor unchanged. Negative offsets remain valid when the resulting position is nonnegative.

`FileSystem.File.seek` now returns `Effect<bigint, PlatformError>` instead of `Effect<bigint>`, so callers must account for the new error channel.
