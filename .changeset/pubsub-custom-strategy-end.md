---
"effect": patch
---

Fix `PubSub.end` leaving publishers suspended on surplus with a custom `PubSub.Strategy`; they now complete with `false`, as with the built-in backpressure strategy.
