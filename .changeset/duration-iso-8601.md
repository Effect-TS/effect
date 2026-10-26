---
"effect": minor
---

Add `Duration.formatIso`, `Duration.fromIso` and `Schema.DurationFromIsoString` for ISO 8601 durations. Only exact units are supported: weeks, days, hours, minutes and seconds. Years and months are rejected because they have no fixed length.
