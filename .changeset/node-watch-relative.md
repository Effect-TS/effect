---
"@effect/platform-node-shared": patch
---

Fix filesystem watch event classification by resolving filenames against the watched directory or file's parent instead of the current working directory. Newly created files are now reported as `Create` rather than `Remove`, while event paths remain relative.
