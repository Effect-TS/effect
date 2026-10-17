---
"effect": patch
---

Fix `Socket.readerString` and `Socket.toChannelString` corrupting multi-byte characters split across binary frames. Decode in streaming mode and flush incomplete trailing characters as U+FFFD on a normal close.
