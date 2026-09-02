---
"effect": patch
---

Fix `PubSub.sliding(1)` delivering duplicate messages to lagging subscribers and losing messages for other subscribers after consumption or unsubscription.
