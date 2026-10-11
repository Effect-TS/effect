---
"effect": patch
---

Preserve the current position when iterating a partially consumed `String.linesIterator` or `String.linesWithSeparators`. Consuming an exhausted iterator now yields no lines instead of restarting from the beginning.
