---
"effect": patch
---

Wait for asynchronous atom cleanup, including `Atom.runtime` layer releases and runtime builds or atom effects still in flight, before the scope holding `AtomRegistry.layer` finishes closing. An uninterruptible atom effect that never completes now keeps that scope from closing. `registry.dispose()` stays synchronous.
