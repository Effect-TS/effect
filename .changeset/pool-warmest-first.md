---
"effect": patch
---

`Pool` now hands out the item used most recently rather than the one used
longest ago.

A released item goes to the front of the availability list instead of the back,
so a sequence of borrows stays on one item rather than cycling through every
item the pool has open. Keeping the rest untouched leaves them reclaimable,
which matters most for items that expire by age: under the old order a pool
that had grown for one burst kept churning through all of them. Freshly
acquired items still go to the back, having no use behind them. Under
saturation the two orders agree.
