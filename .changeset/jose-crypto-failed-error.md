---
"effect": patch
---

Report `effect/jose` crypto backend failures other than rejected keys as `JoseError` reason `CryptoFailed` instead of `InvalidKey`.
