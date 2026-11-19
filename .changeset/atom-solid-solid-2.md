---
"@effect/atom-solid": minor
---

`@effect/atom-solid` now requires Solid 2 (`solid-js` ^2.0.0) and drops Solid 1 support.

- `useAtomResource` is removed. Read `AsyncResult` atoms with `useAtomValue` and match on the result.
- Replace `<RegistryContext.Provider value={registry}>` with `<RegistryContext value={registry}>`, or use `<RegistryProvider>`.
