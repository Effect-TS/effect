---
"effect": patch
---

Fix `Socket.readerString` and `Socket.toChannelString` corrupting characters split across binary frames. Incomplete characters are emitted as U+FFFD before string frames or on close code 1000.
