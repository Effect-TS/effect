---
"effect": patch
---

`Base64Url.decode` and `Base64Url.decodeString` now reject partially padded input such as `Zg=`. Unpadded input (`Zg`) and fully padded input (`Zg==`) still decode.
