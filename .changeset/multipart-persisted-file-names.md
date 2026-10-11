---
"effect": patch
---

Fix `Multipart.toPersisted` failing on uploads named `.` or `..`, and on long multi-byte file names that exceed the file system name limit.
