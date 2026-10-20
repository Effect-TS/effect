---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace `effect/Crypto` with family-specific `effect/crypto/*` services, opaque keys, `CryptoError`, a configurable `WebCrypto` reference and key schemas in `effect/Schema`. Encoding secret or private keys through byte/format schemas requires `{ allowEncode: true }`.

### Breaking changes

- Use `SecureRandom` for randomness and UUIDs, and `Digest` with algorithm values such as `Digest.sha256` for hashing. Replace `effect/testing/TestCrypto` with `Layer.mock` for the required services.
- Provide crypto explicitly; it is no longer included in the runtime `*Services` bundles. `NodeCrypto`, `BunCrypto`, `DenoCrypto` and `BrowserCrypto` offer individual family layers and a combined `layer`, supplying `SecureRandom` where needed. Core modules offer `layerWebCrypto`.
- Provide `Digest.Digest` instead of `Crypto.Crypto` to `SqlMessageStorage` and `SingleRunner`, and instead of `EventLogEncryption` to `SqlEventLogServerEncrypted.makeStorage` and `layerStorage`. Replace `EventLogEncryption.sha256String` with `digest.digestHex(Digest.sha256, bytes)`.

Existing workflow ID, activity idempotency key and event log table-name encodings are unchanged.

UUIDv7 and ULID generation is now monotonic below the maximum 48-bit timestamp, including within a millisecond and across clock rollback. Ordering is per `SecureRandom` instance; the unsafe helpers and model UUIDv7 defaults share per-realm ordering.
