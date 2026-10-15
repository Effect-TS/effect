---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace `effect/Crypto` with modules under `effect/crypto`: `CryptoError`, `WebCrypto`, `SecureRandom`, `Digest`, and per-algorithm modules such as `Aes`, `Ed25519`, and `Rsa`. Each service has a core `layerWebCrypto`. `NodeCrypto` provides `layerDigest` and `layerSecureRandom` and is re-exported by `BunCrypto`; `DenoCrypto`, `BrowserCrypto`, `TestCrypto`, and `TestSecureRandom` are removed, and the `*Services` bundles no longer include crypto services. Cluster SQL message storage now requires `Digest.Digest`.
