---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-browser": patch
"@effect/platform-deno": patch
---

Expand `Crypto` with MD5 digests, SHA HMAC, PBKDF2/HKDF/Argon2id derivation, AES-GCM/AES-CTR/RSA-OAEP/XChaCha20-Poly1305 encryption, HMAC/RSA-PSS/RSASSA-PKCS1-v1_5/ECDSA/Ed25519 signing and verification, ECDH/X25519 key agreement through `deriveSharedSecret`, and raw/SPKI/PKCS8/JWK key generation/import/export, including raw ECDSA/ECDH/Ed25519/X25519 public keys. Add public helpers and fix bounded random sampling and random-source failure handling; `randomIntBetween` now dies with a `RangeError` when its bounds contain no integer or do not round to safe integers; browser MD5 remains unsupported, and Argon2id/XChaCha20-Poly1305 require native provider support. `randomShuffle` fetches the random bytes for its draws in batches, which makes it several times faster. Custom `Crypto` services and `Crypto.make` implementations must provide all added operations, or use `makeSubtle` with an injected native backend and platform overrides for Argon2id/XChaCha20-Poly1305.
