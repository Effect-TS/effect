---
"effect": patch
---

Reject repeated occurrences of single-valued CLI flags instead of silently keeping the first value. Use `Flag.atLeast`, `Flag.atMost` or `Flag.between` to accept multiple values.
