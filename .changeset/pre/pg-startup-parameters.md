---
"@effect/sql-pg": patch
---

Add structured `startupParameters` and opaque `startupOptions` to connection config, and restore support for URL `options`. Explicit `startupOptions` overrides URL `options`; the startup packet field remains `options`. Send session defaults in every physical connection's startup packet, including pooled replacements, with config validation and documented application-name precedence.
