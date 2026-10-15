---
"effect": patch
---

Preserve nanosecond precision when parsing large decimal Duration strings in units from milliseconds through weeks, and avoid intermediate overflow when converting large finite durations to numeric units.
