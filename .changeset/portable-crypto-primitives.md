---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Expand `Crypto` with MD5 digests, SHA HMAC, PBKDF2/HKDF/Argon2id derivation, AES-GCM/RSA-OAEP/XChaCha20-Poly1305 encryption, HMAC/RSA-PSS/RSASSA-PKCS1-v1_5/ECDSA/Ed25519 signing and verification, and raw/SPKI/PKCS8/JWK key generation/import/export. Add public helpers and fix bounded random sampling and random-source failure handling; browser MD5 remains unsupported, and Argon2id/XChaCha20-Poly1305 require native provider support. Custom `Crypto` services and `Crypto.make` implementations must provide all added operations, or use `makeSubtle` with an injected native backend and platform overrides for Argon2id/XChaCha20-Poly1305.
