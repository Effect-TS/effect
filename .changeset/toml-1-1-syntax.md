---
"effect": minor
---

Support TOML 1.1 syntax in `Toml.parse`: multiline inline tables with comments and trailing commas, the `\e` and `\xHH` escapes, and times without seconds. Times without seconds are normalized to `:00`, so `13:37` parses as `"13:37:00"`.
