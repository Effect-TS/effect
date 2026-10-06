---
"effect": minor
---

Add `AtomRegistry` methods for adapters and server rendering:

- `setInitialValue` gives an atom a starting value in an existing registry, as the `initialValues` option of `AtomRegistry.make` does.
- `retain` keeps an atom, and any value it holds, in the registry without computing it.
- `peek` returns an atom's value if the registry has it without computing the atom.
