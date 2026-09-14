---
"@effect/sql-pg": patch
---

Decode unregistered OIDs as UTF-8 text so scalar enums return string labels.

Other binary user-defined types, including enum arrays, may produce garbled text or fail UTF-8 decoding. Decode failures close the connection, failing its pending queries and discarding transactions and `LISTEN` subscriptions; the pool replaces it.

Register scalar codecs with `PgTypes.register`. For arrays, use `PgTypes.makeRegistry().register(elementOid, codec, { arrayOid })` and pass the registry as the client's `types` option.
