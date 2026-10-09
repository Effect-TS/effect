---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-browser": patch
"@effect/platform-deno": patch
---

Expand `Crypto` with MD5 digests, HMAC, PBKDF2/HKDF/Argon2id derivation, AES-GCM/AES-CTR/RSA-OAEP/XChaCha20-Poly1305 encryption, HMAC/RSA-PSS/RSASSA-PKCS1-v1_5/ECDSA/Ed25519 signing and verification, ECDH/X25519 key agreement through `deriveSharedSecret`, and raw/SPKI/PKCS8/JWK key generation, import, and export.

`Crypto.make` accepts an optional Web Crypto `subtle` backend and optional per-operation overrides; operations with neither fail with `PlatformError.BadArgument`, so existing `make({ randomBytes, digest })` calls keep working. Failed authenticated decryption and malformed key data fail with a `SystemError` tagged `InvalidData`. Browser MD5 is unsupported, and Argon2id/XChaCha20-Poly1305 require native runtime support.

Fix bounded random sampling and random-source failure handling: `randomIntBetween` now dies with a `RangeError` when its bounds contain no integer or do not round to safe integers, and `randomShuffle` fetches its random bytes in batches.
