---
"@effect/sql-pg": patch
---

Allow PostgreSQL statements with up to 65,535 bound parameters. `Parse` and `Bind` previously rejected more than 32,767 parameters with an `EncodeError`, although the protocol counts are unsigned 16-bit values.
