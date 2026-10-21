---
"effect": patch
---

Fix `Toml.parse` accepting out of range dates and times, such as `1979-02-30` or `24:00:00`, and moving invalid offset date-times to a later date.
