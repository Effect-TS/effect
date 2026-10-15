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

- Replace `Crypto` and the bundled `NodeCrypto.layer` with individual family services and layers. Node and Bun expose `layerDigest`, `layerAead` and other family layers through `NodeCrypto` and `BunCrypto`; browsers, Deno and Workers use core `layerWebCrypto` layers. Crypto is no longer included in `*Services` bundles.
- Replace `BrowserCrypto` and `DenoCrypto` with core layers, and `effect/testing/TestCrypto` with family mocks using `Layer.mock`.
- Provide `Digest.Digest` instead of `Crypto.Crypto` to `SqlMessageStorage` and `SingleRunner`, and instead of `EventLogEncryption` to `SqlEventLogServerEncrypted.makeStorage` and `layerStorage`. Replace `EventLogEncryption.sha256String` with `Digest.digestHex` using SHA-256.

Workflow execution IDs, activity idempotency keys and event log table names retain their existing encodings.
