---
"effect": patch
---

Compute `ConfigError.message` once during construction so `message` and `toString()` stay readable if `cause` is later replaced.
