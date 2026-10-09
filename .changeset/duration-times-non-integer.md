---
"effect": patch
---

Fix `Duration.times` throwing when a nanosecond-backed duration is multiplied by a fractional or non-finite number. Fractional results round to the nearest nanosecond.
