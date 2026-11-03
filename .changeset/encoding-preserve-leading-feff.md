---
"effect": patch
---

Keep a leading U+FEFF when decoding strings with `Base64`, `Base64Url`, `Hex`, and their `Schema.StringFrom*` codecs, including `HttpApiSecurity.basic` usernames.
