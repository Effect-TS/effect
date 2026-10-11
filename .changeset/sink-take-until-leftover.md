---
"effect": patch
---

Fix `Sink.takeUntil` and `Sink.takeUntilEffect` consuming and dropping the input after the match, which lost elements in `Stream.transduce` and `Stream.peel` and waited for one more element after the match.
