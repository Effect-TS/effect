---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace `effect/Crypto` with per-family `effect/crypto` modules for secure randomness, digests, MACs, key derivation, encryption, signatures, key agreement, key wrapping and key formats. Add opaque keys, a shared `CryptoError`, a configurable `WebCrypto` reference and 28 key schemas. Secret and private key schemas require `{ allowEncode: true }` to export keys.

### Breaking changes

- Replace `Crypto` with individual family services and layers. `NodeCrypto`, `BunCrypto`, `DenoCrypto` and `BrowserCrypto` expose `layerDigest`, `layerAead` and the other family layers, plus a `layer` that provides every family. Node and Bun run some families on `node:crypto`; the Deno and browser layers are the core `layerWebCrypto` layers, which Workers also use. Crypto is no longer included in `*Services` bundles.
- Replace `effect/testing/TestCrypto` with family mocks using `Layer.mock`.
- Provide `Digest.Digest` instead of `Crypto.Crypto` to `SqlMessageStorage` and `SingleRunner`, and instead of `EventLogEncryption` to `SqlEventLogServerEncrypted.makeStorage` and `layerStorage`. Replace `EventLogEncryption.sha256String` with the Digest service's `digestHex` using SHA-256.

Workflow execution IDs, activity idempotency keys and event log table names retain their existing encodings.

UUIDv7s and ULIDs are strictly increasing within a millisecond, below the maximum 48-bit timestamp: per instance for the `SecureRandom` service, and per JS realm for `uuidV7Unsafe`, `ulidUnsafe`, `Model.UuidV7Insert` defaults and `EventJournal.makeEntryIdUnsafe()`.
