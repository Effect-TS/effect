---
"@effect/atom-angular": patch
---

Add `@effect/atom-angular`, Angular bindings for the Effect Atom modules.

The package exposes the Atom registry through Angular dependency injection with `provideAtomRegistry`,
`ATOM_REGISTRY`, `injectAtomRegistry`, and `REGISTRY_OPTIONS` / `injectRegistryOptions` for configuring the
registry a scope creates.

Injection functions surface atoms as Angular signals and operations on them: `injectAtomValue`,
`injectAtomRef`, `injectAtomComputed`, `injectAtomMount`, `injectAtomSubscribe`, `injectAtomRefresh`,
`injectAtomSet`, `injectAtomUpdate`, `injectAtomSetExit`, `injectAtomSetPromise`, and `injectDestroyRef`.
`injectMakeAtom` bundles those operations into a single store whose surface is selected from the atom's
type — reads for every atom, writes for writable ones, and `matchResult` for `Result`-shaped ones —
and `atomMatchResult` flattens a `Result`-shaped store into one template-ready view tagged by
`ATOM_RESULT_STATUS`.

Every `inject*` function must be called from an injection context. Subscriptions and keepalives are created
synchronously and released when the surrounding injector is destroyed; what those functions return — setters,
refresh callbacks, and the store's methods — captures the registry at injection time and stays callable
outside an injection context.
