---
"effect": patch
---

Release the durable waits of losing `DurableDeferred.raceAll` branches once the race settles, so a late completion such as a losing `DurableClock.sleep` no longer preempts and replays the continuing workflow
