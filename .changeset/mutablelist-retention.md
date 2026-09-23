---
"effect": patch
---

A `MutableList` that never becomes empty, such as a `Queue` kept non-empty under backpressure, no longer keeps a slot for every element it has ever carried. Taken slots in the block at the head are released once they reach eight times the elements left in it, so the memory a list holds now follows the elements it holds rather than the messages that have passed through it.
