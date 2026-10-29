---
"effect": patch
---

Stop finished fibers from retaining their last span and stack frame. A finished fiber kept alive by a cache entry, observer or `Deferred` no longer keeps the ended span's parent chain, and the success values recorded on those spans, from being garbage collected.
