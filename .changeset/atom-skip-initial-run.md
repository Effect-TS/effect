---
"effect": patch
"@effect/atom-react": patch
"@effect/atom-solid": patch
---

Add a `skipInitialRun` option to `Atom.serializable` and `Atom.initialValue`. A seeded effect or stream atom then keeps its hydrated or initial value instead of running on mount, until it is refreshed or a dependency changes. Factory `get(...)` calls and `withReactivity` keys are still tracked; dependencies read inside the effect are tracked from its first real run.
