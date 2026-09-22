---
"effect": patch
---

`Cache` and `ScopedCache` now give each entry's lookup a single owner, so interrupting one caller cannot affect the others.

- `ScopedCache.get` and `ScopedCache.refresh` ran the shared lookup on the first caller's fiber. Interrupting that caller interrupted the lookup for everyone, cached the interruption as the entry's result, and left the entry's scope open; every later `get` of that key returned the interruption. The lookup now runs on a fiber owned by the entry, an interrupted lookup is never cached, and its scope is closed.
- `Cache.get`: a caller joining an in-flight lookup just as the last caller left could be handed an interruption it never asked for, and a caller interrupted between joining and installing its cleanup left the lookup fiber running with no callers.
- A `timeToLive` function that throws now fails that lookup with a defect. It used to throw from whichever fiber completed the lookup, hanging every concurrent `get` of that key.
