---
"effect": patch
---

Delay copying a derived Context's base until it has been read at least as many times as its size (with a minimum of eight), avoiding full copies for short-lived contexts.
