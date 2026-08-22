---
"@effect/sql-pg": patch
---

Add low-level PostgreSQL protocol, binary type, and authentication codecs to `@effect/sql-pg`.

`PgProtocol` encodes protocol 3.0 frontend messages and incrementally parses backend messages. `PgTypes` handles built-in binary scalar and one-dimensional array OIDs, supports custom codecs, and provides direct Bind and DataRow paths that avoid per-value copies. `PgAuth` implements MD5 and SCRAM-SHA-256 authentication.

Encoded frames and decoded byte fields are stable views over internal buffers. Copy data that must outlive its message. `PgClient` remains unchanged and still uses `pg` at runtime.
