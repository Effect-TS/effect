---
"effect": patch
---

Speed up `FileSystem.glob` by reading subdirectories concurrently, in at most 16 forked fibers per call plus the calling fiber, and only forking a fiber for directory entries that need a `stat` or `readLink`. Results and their order are unchanged.
