---
"effect": patch
---

Reduce Atom bundle size by moving the atom context `stream` and `streamResult`
methods to standalone `Atom.stream` and `Atom.streamResult` functions.

The context methods lived on the shared context prototype, so every atom user
paid for the `Stream` and `Queue` machinery even when no streams were used.
As standalone functions they are only included in a bundle when actually
imported, shrinking a minimal atom bundle by around 23%.

```ts
// before
Atom.make((get) => get.stream(count))
// after
Atom.make((get) => Atom.stream(get, count))
```

The atom context also exposes a readonly `disposed` flag.
