---
"effect": patch
---

Fix `PubSub` losing or reordering messages when publishers or subscribers resume synchronously:

- `PubSub.end` now delivers already-buffered messages to waiting subscribers before the final message, for every strategy. Previously a waiting subscriber could receive the final message and lose buffered messages, for example when a resumed publisher or subscriber ended the `PubSub`. This made `Stream.broadcastN` lose the last element on a subscriber that keeps up while another lags more than `capacity` behind.
- A take started while `PubSub.end` is still delivering buffered messages now waits behind the takers already waiting instead of receiving the final message first.
- `PubSub.end` stops serving waiting subscribers once the `PubSub` has been shut down.
- `PubSub.publish`, `PubSub.publishUnsafe` and `PubSub.publishAll` no longer publish ahead of backpressured publishers that are still waiting for capacity.
