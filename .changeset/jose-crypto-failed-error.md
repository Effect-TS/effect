---
"effect": patch
---

Add `JoseError.CryptoFailed` in `effect/jose`: an unsupported signing or encryption provider now returns `JoseError.CryptoFailed` instead of `InvalidKey`, while rejected keys still return `InvalidKey`.
