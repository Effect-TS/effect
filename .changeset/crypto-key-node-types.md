---
"effect": patch
---

Fix type-checking the `effect` crypto declarations with `@types/node` 22 or 24 and without the DOM library. The `*FromCryptoKey` constructors in `Aead`, `Cipher`, `KeyAgreement`, `KeyWrap`, `Mac` and `Signature` now accept the new structural `WebCrypto.CryptoKey` type instead of the global `CryptoKey`, and DOM and Node Web Crypto keys are both assignable to it. The `WebCrypto` reference and `WebCrypto.layer` now use the type of `globalThis.crypto` instead of the global `Crypto` type.
