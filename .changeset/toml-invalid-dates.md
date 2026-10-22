---
"effect": patch
---

Fix `Toml.parse` accepting out of range dates and times such as `1979-02-30` or `24:00:00`, and rolling `1979-02-30T07:32:00Z` over to March 2 instead of rejecting it.
