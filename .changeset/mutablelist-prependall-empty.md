---
"effect": patch
---

Fix `MutableList.prependAll` with empty input corrupting the list and breaking subsequent takes or appends.
