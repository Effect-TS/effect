---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Expand `Crypto` with MD5 digests, SHA HMAC/PBKDF2, AES-GCM and RSA-OAEP encryption/decryption, RSA-PSS/ECDSA/Ed25519 signing, and key generation/import/export across Node, Bun, browser, and Deno. Add public helpers for existing operations and fix bounded random sampling and random-source failure handling; browser MD5 remains unsupported. Custom `Crypto` services and `Crypto.make` implementations must supply `hmac`, `pbkdf2`, `rsaOaepEncrypt`, `generateSecretKey`, `generateKeyPair`, `importKey`, `exportKey`, `encrypt`, `decrypt`, `sign`, and `verify`, or use `makeSubtle` with an explicitly supplied native backend.
