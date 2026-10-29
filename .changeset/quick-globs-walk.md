---
"effect": patch
---

Speed up `FileSystem.glob` by reading subdirectories concurrently, at most 16 at a time across the whole walk, and only forking a fiber for directory entries that need a `stat` or `readLink`. Results and their order are unchanged.
