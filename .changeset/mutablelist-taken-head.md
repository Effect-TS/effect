---
"effect": patch
---

`MutableList.takeN` no longer leaves an emptied block at the head of the list when the count it takes ends exactly at that block's last element. From that point the list returned `undefined` from every `take`, its `length` went negative, and elements appended later could never be taken. Through `Queue`, `offerAll([1, 2])`, `offerAll([3])` and `takeN(2)` made the queue stop delivering: `peek` and every later `take` returned `undefined`, including after new offers.
