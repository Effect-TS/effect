---
"effect": minor
---

Consolidate `Effect.asyncOption`, `Effect.asyncEither`, `Stream.asyncOption`, `Stream.asyncEither`, and `Stream.asyncInterrupt`

This PR removes `Effect.asyncOption` and `Effect.asyncEither` as their behavior can be entirely implemented with the new signature of `Effect.async`, which optionally returns a cleanup `Effect` from the registration callback.

```ts
declare const async: <A, E = never, R = never>(
  register: (callback: (_: Effect<A, E, R>) => void, signal: AbortSignal) => void | Effect<void, never, R>,
  blockingOn?: FiberId
) => Effect<A, E, R>
```

Additionally, this PR removes `Stream.asyncOption`, `Stream.asyncEither`, and `Stream.asyncInterrupt` as their behavior can be entirely implemented with the new signature of `Stream.async`, which can optionally return a cleanup `Effect` from the registration callback.

```ts
declare const async: <A, E = never, R = never>(
  register: (emit: Emit<R, E, A, void>) => Effect<void, never, R> | void,
  outputBuffer?: number
) => Stream<A, E, R>
```
