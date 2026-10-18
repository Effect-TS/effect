---
"effect": minor
"@effect/atom-react": patch
"@effect/atom-solid": patch
---

Add a `keepInitialValue` option to `Atom.serializable` and `Atom.initialValue`. A seeded effect or stream atom with this option keeps its hydrated or initial value instead of running its effect on mount, until it is refreshed or a dependency changes. Factory `get(...)` calls and `withReactivity` keys are still tracked. Dependencies read inside the effect are tracked from its first real run.
