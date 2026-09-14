---
"@effect/sql-pg": patch
---

Add structured `startupParameters` and restore opaque `options` from connection URLs and explicit config. Send session defaults in every physical connection's startup packet, including pooled replacements, with config validation and documented application-name precedence.
