---
"effect": patch
---

`Pool` now hands out the item used most recently rather than the one used
longest ago.

A released item goes to the front of the availability list instead of the back,
so a sequence of borrows stays on one item. Spreading them evenly over every
item the pool has open leaves none of them warm, and leaves `timeToLive` with
nothing to reclaim, because a pool that grew for one burst keeps every item
equally fresh forever. Freshly acquired items still go to the back, having no
use behind them. Under saturation the two orders agree.
