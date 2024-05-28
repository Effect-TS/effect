---
"effect": minor
---

add `permits` option to `Pool.make` & `Pool.makeWithTTL`

This option allows you to specify the level of concurrent access per pool item.
I.e. setting `permits: 2` will allow each pool item to be in use by 2 concurrent tasks.
