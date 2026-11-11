---
"effect": patch
---

Fix `Prompt.Int` and `Prompt.Number` dropping the minus sign when a zero follows it, so typing `-0.05` no longer submits `0.05`.
