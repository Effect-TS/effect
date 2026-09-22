---
"effect": patch
---

Fix `PubSub`, `Queue` and `MutableList` correctness issues, and reduce `PubSub` waiter and `TxPriorityQueue.offerAll` overhead:

- `MutableList.takeN` could leave a drained bucket at the head, so a following `MutableList.take`, `Queue.take` or `Queue.peek` returned `undefined` and the next element was lost (reachable after `Queue.offerAll`).
- A `MutableList`, and so a `Queue`, that never fully empties no longer retains a backing slot for every element it ever carried.
- A `PubSub.take` or `PubSub.takeAll` interrupted just before it suspended could leave a poller behind that consumed the next message, and a backpressured `PubSub.publish` interrupted at that point could still publish its message.
- Waiting `PubSub` subscribers and publishers suspend with less overhead.
- `TxPriorityQueue.offerAll` merges the new values into the already sorted queue instead of copying and re-sorting all of it.
