---
"effect": patch
---

Add `Flag.withOptionalValue` for CLI flags whose value is optional: a bare `--watch` uses the given value, while `--watch=until-done` sets one explicitly (GNU-style, the value must follow `=`).
