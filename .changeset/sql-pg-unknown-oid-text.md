---
"@effect/sql-pg": patch
---

Decode columns whose OID has no registered codec as UTF-8 text instead of raw bytes, so user-defined enums read as their labels. Invalid UTF-8 fails with `CodecError`, as it does for `text`. `bytea` and every other built-in codec are unchanged. Use `PgTypes.register` for user-defined types whose binary representation is not UTF-8.
