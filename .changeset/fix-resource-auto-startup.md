---
"effect": patch
---

Fix `Resource.auto` to wait for the first scheduled run before refreshing, avoiding an extra acquisition immediately after construction.
