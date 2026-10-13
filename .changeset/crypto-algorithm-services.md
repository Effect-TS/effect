---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Split `effect/Crypto` into algorithm modules under `effect/crypto`, such as `Aes`, `Ed25519`, `Rsa`, and `Sha2`, each with a Web Crypto `layer`. Asymmetric keys are typed per key family. `NodeCrypto`, `BunCrypto`, and `DenoCrypto` add MD5, ChaCha20-Poly1305, and Argon2id where the runtime supports them. `BrowserCrypto` and `TestCrypto` are removed; use the Web Crypto layers and `TestSecureRandom` instead.
