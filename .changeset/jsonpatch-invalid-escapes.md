---
"effect": patch
---

`JsonPatch.apply` now throws on malformed JSON Pointer escapes, such as `/a~2` or a trailing `~`, instead of treating them as literal keys.
