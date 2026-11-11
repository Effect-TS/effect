---
"effect": patch
---

Keep the minus sign when a `0` is typed right after it in `Prompt.Number` and `Prompt.Int`, so `-0.05` submits `-0.05` instead of `0.05`, and `-07` submits `-7` instead of `7`.
