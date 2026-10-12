---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace the `Crypto` service in `effect/Crypto` with algorithm-specific services, such as `Crypto.Aes`, `Crypto.Ed25519`, `Crypto.Rsa`, and `Crypto.Sha2`, each with a Web Crypto layer such as `Crypto.layerAes`. Asymmetric keys are typed per key family. `NodeCrypto`, `BunCrypto`, and `DenoCrypto` add MD5, ChaCha20-Poly1305, and Argon2id where the runtime supports them. `BrowserCrypto` and `TestCrypto` are removed; use the Web Crypto layers and `TestSecureRandom` instead.
