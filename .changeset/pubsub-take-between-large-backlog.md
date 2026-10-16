---
"effect": patch
---

Fix `PubSub.takeBetween` throwing a `RangeError` when a large backlog is taken at once.
