---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace `effect/Crypto` with twelve modules under `effect/crypto`, one per primitive family.

- `SecureRandom`: random bytes, uniform integers, shuffles, UUIDv4, UUIDv7 and ULID, plus sync `randomBytesUnsafe`, `uuidV4Unsafe`, `uuidV7Unsafe` and `ulidUnsafe`.
- `Digest`: MD5 and SHA-1/256/384/512, as a service and as top-level `digest` and `digestHex`.
- `Mac`: HMAC and `timingSafeEqual`.
- `Kdf`: HKDF, PBKDF2 and Argon2id.
- `Aead`: AES-GCM, ChaCha20-Poly1305 and XChaCha20-Poly1305.
- `Cipher`: unauthenticated AES-CTR and AES-CBC.
- `Signature`: Ed25519, ECDSA P-256/384/521, RSA-PSS and RSASSA-PKCS1-v1_5.
- `KeyAgreement`: ECDH P-256/384/521 and X25519.
- `KeyWrap`: AES-KW and RSA-OAEP.
- `KeyFormat`: SPKI, PKCS#8, JWK and PEM import and export, with import-only PKCS#1 and SEC1.
- `WebCrypto`: a reference to the WebCrypto `Crypto` object, defaulting to `globalThis.crypto`, and `layer(crypto)` to replace it.
- `CryptoError`: the error type shared by every family.

Each service module has its own `layerWebCrypto`, and there is no bundled crypto layer. `NodeCrypto` in `@effect/platform-node-shared` exports one layer per family (`layerSecureRandom`, `layerDigest`, `layerMac`, `layerKdf`, `layerAead`, `layerCipher`, `layerSignature`, `layerKeyAgreement` and `layerKeyWrap`), using `node:crypto` where it is faster. `@effect/platform-node` re-exports it as `NodeCrypto` and `@effect/platform-bun` as `BunCrypto`.

Removed: `effect/Crypto`, `effect/testing/TestCrypto`, `BrowserCrypto`, `DenoCrypto`, the single `NodeCrypto.layer`, and the `Crypto` service in `NodeServices`, `BunServices` and the other `*Services` bundles. Browsers, Deno and Workers use the core `layerWebCrypto` layers. Tests mock a family with `Layer.mock`.

`Schema` gains 28 key schemas. Every key type has a declared schema for live keys and a `*FromFormat` schema. Key types with a raw form also have a `*FromBytes` schema. Examples are `Schema.AeadKey`, `Schema.AeadKeyFromBytes` and `Schema.SignaturePublicKeyFromFormat`. Secret and private key schemas refuse to encode unless `{ allowEncode: true }` is passed.

Callers in the repo now use the new modules:

- `SqlMessageStorage` and `SingleRunner` require `Digest.Digest` instead of `Crypto.Crypto`.
- `SqlEventLogServerEncrypted.makeStorage` and `layerStorage` require `Digest.Digest` instead of `EventLogEncryption`.
- `EventLogEncryption` no longer has `sha256String`.

Workflow execution ids, activity idempotency keys and event log table names are unchanged.
