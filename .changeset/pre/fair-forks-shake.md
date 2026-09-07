---
"effect": patch
---

Fix unstable CLI boolean flags so `Flag.optional(Flag.Boolean(...))` returns `Option.none()` when omitted, and support canonical `--no-<flag>` negation for boolean flags.
