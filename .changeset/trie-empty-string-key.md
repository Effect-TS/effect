---
"effect": patch
---

Store the empty string key in `Trie` instead of silently discarding it. Construction, lookup, replacement, modification, removal, iteration and `longestPrefixOf` now treat `""` like any other key.
