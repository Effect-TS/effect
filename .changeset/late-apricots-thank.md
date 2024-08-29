---
"@effect/cli": patch
---

Renders the default for all `Prompt` types that accepts `TextOptions`.

- The default value will be rendered as ghost text for `Prompt.text` and `Prompt.list`.
- The default value will be rendered as redacted ghost text for `Prompt.password`.
- The default value will remain hidden for `Prompt.hidden`.
