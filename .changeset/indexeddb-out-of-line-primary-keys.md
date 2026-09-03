---
"@effect/platform-browser": patch
---

Preserve out-of-line primary keys in IndexedDB first and array queries, including queries through secondary indexes. Ranged first queries now return the matching row instead of failing to decode its missing key, and index queries return each row's primary key rather than its index key.
