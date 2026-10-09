---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-browser": patch
"@effect/platform-deno": patch
---

Expand `Crypto` with MD5, HMAC creation and constant-time verification, PBKDF2/HKDF/Argon2id derivation, AES-GCM/AES-CTR/RSA-OAEP/XChaCha20-Poly1305 encryption, and HMAC/RSA-PSS/RSASSA-PKCS1-v1_5/ECDSA/Ed25519 signatures. Add ECDH/X25519 key agreement, key generation, and raw/SPKI/PKCS8/JWK import and export.

`Crypto.make` accepts a `Crypto.Backend` with `randomBytes`, optional Web Crypto `subtle`, and optional byte-level overrides. Key operations use `subtle`. Existing `make({ randomBytes, digest })` calls remain valid; custom services implementing `Crypto` directly must provide the new methods. `TestCrypto` keeps seeded randomness and delegates other operations to the platform service.

Unavailable operations fail with the new `Unsupported` system error tag. Failed authenticated decryption, malformed key data, and rejected X25519 small-order points fail with `InvalidData`. Browser MD5 is unsupported; Argon2id and XChaCha20-Poly1305 require native runtime support.

Fix bounded random sampling and random-source failure handling. `randomIntBetween` dies with `RangeError` for empty ranges or bounds that do not round to safe integers. `randomShuffle` batches random-byte requests.
