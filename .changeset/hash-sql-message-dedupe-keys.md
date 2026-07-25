---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

unstable/cluster: hash SQL message deduplication keys to prevent `message_id` overflow, closes #6317.

The composed request deduplication key (`entityType/entityId/tag/primaryKey`) can legally exceed the 255-character `message_id` column — the address columns alone allow 458 characters before the RPC primary key is appended. `SqlMessageStorage` now stores a SHA-256 digest (64 hex characters) of the composed key in the unique `message_id` column, so keys of any length work on PostgreSQL, MySQL, MSSQL, and SQLite. No schema change is required; the key's components remain readable via the `entity_type`, `entity_id`, `tag`, and `payload` columns.

Rows written before this change store the plaintext key in `message_id`; save-time deduplication and `requestIdForPrimaryKey` fall back to a plaintext read for those rows, so in-flight requests keep deduplicating across the upgrade.

`SqlMessageStorage.layer`/`layerWith` (and consequently `SingleRunner.layer`) now require `Crypto.Crypto`. The Node and Bun cluster convenience layers provide the platform Crypto implementation internally, so their requirements are unchanged.
