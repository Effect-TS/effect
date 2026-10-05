---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Add MD5 digests, SHA-based HMAC and PBKDF2, and RSA-OAEP public-key encryption to `Crypto`, with Node, Bun, browser, and Deno implementations. The new capabilities are optional on custom services; `Crypto.hmac`, `Crypto.pbkdf2`, and `Crypto.rsaOaepEncrypt` report missing support as typed platform errors. Browser MD5 remains unsupported.
