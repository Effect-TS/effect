---
"@effect/atom-livestore": patch
---

Add `@effect/atom-livestore`, porting the LiveStore bindings from `@effect-atom/atom-livestore` to Effect v4.

`AtomLivestore.Tag` creates a `Context.Service` class for a LiveStore `Store` backed by an atom runtime, exposing atoms for accessing the store (`store`, `storeUnsafe`), reactive query helpers (`makeQuery`, `makeQueryUnsafe`), and a writable atom for committing events (`commit`).
