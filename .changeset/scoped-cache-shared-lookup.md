---
"effect": patch
---

Keep scoped cache lookups alive while callers are waiting, and release abandoned lookups and their scopes when the last caller is interrupted. Lookups for missing keys (including `refresh`) now run in an interruptible daemon fiber, like `Cache`: child fibers forked inside a lookup end with that lookup fiber rather than living as long as the initiating caller.
