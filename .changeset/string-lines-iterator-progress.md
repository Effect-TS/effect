---
"effect": patch
---

Fix `String.linesIterator` and `String.linesWithSeparators` iterators restarting from the first line when iterated again, instead of continuing from their current position.
