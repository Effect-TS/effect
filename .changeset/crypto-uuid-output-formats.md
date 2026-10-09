---
"effect": patch
---

Turn `Crypto.randomUUIDv4` and `Crypto.randomUUIDv7` into functions accepting an optional `{ format: "hex" | "bytes" }` option. Call them with `()` for the default lowercase, hyphenated UUID string, or with `{ format: "bytes" }` for a 16-byte `Uint8Array`.
