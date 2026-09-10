---
"effect": patch
"@effect/platform-node-shared": patch
---

Keep `FileSystem.stat` working when optional identity metadata such as NTFS inodes exceeds `Number.MAX_SAFE_INTEGER`. Overflowed optional fields (`ino`, `nlink`, `uid`, `gid`, `rdev`, `blocks`) are now `Option.none()` instead of failing the whole `stat` with `BadArgument`.
