---
"effect": patch
---

Fix `Schema.Struct` fields named after `Object.prototype` members, such as `constructor` or `toString`, being treated as present when the input object does not define them.
