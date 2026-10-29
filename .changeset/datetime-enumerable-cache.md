---
"effect": patch
---

Fix `DateTime.Zoned` exposing its `adjustedEpochMilliseconds` cache as an enumerable property after `DateTime.toDate`, which broke `Object.keys`, spread and deep equality.
