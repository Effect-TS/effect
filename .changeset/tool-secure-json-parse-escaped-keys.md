---
"effect": patch
---

Fix `Tool.unsafeSecureJsonParse` accepting Unicode-escaped `__proto__` and `constructor` keys. JSON text containing a `\u` escape is now always scanned, so escaped spellings throw a `SyntaxError` like their literal forms.
