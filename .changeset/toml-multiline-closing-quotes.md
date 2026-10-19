---
"effect": patch
---

Fix `Toml.parse` rejecting multiline strings that end with one or two quotes right before the closing delimiter, such as `"""say "hi""""`.
