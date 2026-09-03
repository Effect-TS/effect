---
"effect": patch
---

Honor explicit numeric `0` and bigint `0n` values for `DurableClock.sleep`'s `inMemoryThreshold`, routing positive durations through durable clocks instead of applying the 60-second default. Omitted or `undefined` thresholds retain the default, and zero-duration sleeps remain no-ops.
