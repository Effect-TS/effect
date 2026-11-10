---
"effect": patch
---

Add `TextDiff.hunks`, which groups a line diff into hunks as data, as `diff -u` does, optionally with the differing ranges of lines changed one for one. `TextDiff.unified` renders these hunks.
