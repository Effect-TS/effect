---
"effect": patch
---

Fix `Stream.broadcast`, `Stream.broadcastN`, `Stream.share` and `Stream.toPubSubTake` subscribers that never end.

The upstream's exit was published as an ordinary message, so a subscriber that arrived after it, or whose bounded `dropping` PubSub was full, waited forever. The new `PubSub.end` ends a PubSub with a final message that every subscriber, current or future, receives after draining its buffered messages, and the broadcast operators now use it for the exit.
