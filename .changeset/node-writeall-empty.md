---
"@effect/platform-node-shared": patch
---

Allow `File.writeAll` and filesystem sinks to accept empty byte buffers without failing with `WriteZero` or changing file contents or the cursor.
