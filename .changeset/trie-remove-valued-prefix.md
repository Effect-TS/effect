---
"effect": patch
---

Fix `Trie.remove` and `Trie.removeMany` to preserve other stored entries, including prefixes and sibling keys, when removing their last child. Stored `undefined` values are preserved as well.
