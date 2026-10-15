---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Replace `effect/Crypto` with modules under `effect/crypto`: `CryptoError`, `WebCrypto`, `SecureRandom`, `Digest`, `Mac`, `Kdf`, `Aead`, `Cipher`, `Signature`, `KeyAgreement`, `KeyWrap`, and `KeyFormat`. Each service has a core `layerWebCrypto`. `NodeCrypto` provides `layerDigest`, `layerMac`, `layerKdf`, `layerAead`, `layerCipher`, `layerSignature`, `layerKeyAgreement`, `layerKeyWrap`, and `layerSecureRandom` and is re-exported by `BunCrypto`; `DenoCrypto`, `BrowserCrypto`, `TestCrypto`, and `TestSecureRandom` are removed, and the `*Services` bundles no longer include crypto services. Cluster SQL message storage now requires `Digest.Digest`. `Schema` gains key schemas for every family, such as `Schema.AeadKey`, `Schema.AeadKeyFromBytes`, and `Schema.SignaturePublicKeyFromFormat`.
