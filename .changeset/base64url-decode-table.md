---
"effect": patch
---

Speed up `Base64Url.decode` and `Base64Url.decodeString` by decoding the URL-safe alphabet directly, instead of transliterating the input and decoding it again as standard Base64.
