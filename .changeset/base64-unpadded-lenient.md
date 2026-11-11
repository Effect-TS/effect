---
"effect": patch
---

Add `Base64.encodeUnpadded`, which encodes standard Base64 without `=` padding, and `Base64.decodeLenient`, which decodes either Base64 alphabet with or without padding, as protobuf JSON and the Connect protocol accept it.
