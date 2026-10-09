---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-browser": patch
"@effect/platform-deno": patch
---

Expand `Crypto` with MD5 digests, HMAC creation and constant-time verification, PBKDF2/HKDF/Argon2id derivation, AES-GCM/AES-CTR/RSA-OAEP/XChaCha20-Poly1305 encryption, HMAC/RSA-PSS/RSASSA-PKCS1-v1_5/ECDSA/Ed25519 signing and verification, ECDH/X25519 key agreement through `deriveSharedSecret`, and raw/SPKI/PKCS8/JWK key generation, import, and export.

`Crypto.make` now takes a `Crypto.Backend`: `randomBytes`, an optional Web Crypto `subtle`, and optional byte-level primitives such as `digest` or `argon2id`. Key operations come only from `subtle`. Operations a backend cannot perform fail with a new `Unsupported` `SystemErrorTag`; failed authenticated decryption and malformed key data fail with `InvalidData`. Browser MD5 is unsupported, and Argon2id/XChaCha20-Poly1305 require native runtime support.

Fix bounded random sampling and random-source failure handling: `randomIntBetween` now dies with a `RangeError` when its bounds contain no integer or do not round to safe integers, and `randomShuffle` fetches its random bytes in batches.
