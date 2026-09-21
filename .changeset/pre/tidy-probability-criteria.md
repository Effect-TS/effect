---
"effect": patch
---

Make `criteria` optional for `Decision.probability`. When supplied, `criteria` still requires descriptions for both `false` and `true`.

`Decision.Probability.criteria` is now optional, so consumers reading outcome descriptions (for example, `decision.criteria.true`) must first guard against `undefined`.
