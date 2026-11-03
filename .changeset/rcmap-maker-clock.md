---
"effect": patch
---

Run `RcMap` idle timers in the context the map was made with instead of the fiber that released an entry last. Idle time, including `RcMap.touch`, is now measured on the clock of the map's maker, and the timer no longer runs under the last borrower's span or supervisor.
