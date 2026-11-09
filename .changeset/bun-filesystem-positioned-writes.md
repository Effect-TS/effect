---
"@effect/platform-node-shared": patch
"@effect/platform-bun": patch
---

Fix `File.write` and `File.writeAll` from `BunFileSystem.layer` writing at the wrong offset after a `seek` on Bun.
