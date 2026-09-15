---
"effect": patch
---

Align the `Effect` and `Stream` APIs and fix several Stream type signatures.

- `Effect.orElseSucceed` now passes the error to the fallback function, matching `Stream.orElseSucceed`.
- `Effect.isEffect` narrows to `Effect<unknown, unknown, unknown>` instead of `any`.
- `Stream.bind`, `Stream.bindEffect` and `Stream.let` allow re-binding an existing field and produce the same record type as their `Effect` counterparts.
- `Stream.Success`, `Stream.Error` and `Stream.Services` are unconstrained and distributive like the `Effect` versions.
- `Stream.partition` returns `[passes, fails]` and takes a `capacity` option, matching `Stream.partitionQueue` and `Stream.partitionEffect`. Its default capacity remains 16.
- `Stream.mapBoth` takes `onElement` / `onError`, matching `Stream.tapBoth`.
- `Stream.scan` and `Stream.scanEffect` take a lazy initial state.
- `Stream.catchTags` rejects unknown tag keys like `Effect.catchTags`.
- Fixed the data-first overloads of `Stream.runIntoPubSub` (error type was dropped), `Stream.cross` (swapped type parameter names) and `Stream.mapAccumArray` (`onHalt` return type).
- Added `Stream.as`, `Stream.tapDefect`, `Stream.tapErrorTag` and `Stream.unwrapReason`.
- Stream concurrency options use the `Types.Concurrency` alias, and JSDoc categories were consolidated across both modules.
