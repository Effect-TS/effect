---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Add MD5 digests, SHA-based HMAC and PBKDF2, and RSA-OAEP public-key encryption to `Crypto`, with Node, Bun, browser, and Deno implementations. Custom `Crypto` services and calls to `Crypto.make` must now supply `hmac`, `pbkdf2`, and `rsaOaepEncrypt`. Browser MD5 remains unsupported.
