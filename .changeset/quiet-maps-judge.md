---
"effect": minor
---

add `concurrency` & `targetUtilization` option to `Pool.make` & `Pool.makeWithTTL`

This option allows you to specify the level of concurrent access per pool item.
I.e. setting `concurrency: 2` will allow each pool item to be in use by 2 concurrent tasks.

`targetUtilization` determines when to create new pool items. It is a value
between 0 and 1, where 1 means only create new pool items when all the existing
items are fully utilized.

A `targetUtilization` of 0.5 will create new pool items when the existing items are
50% utilized.
