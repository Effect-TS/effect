---
"effect": patch
---

Wait for asynchronous atom cleanup, including `Atom.runtime` layer releases and runtime builds still in flight, before the scope holding `AtomRegistry.layer` finishes closing. `registry.dispose()` stays synchronous.
