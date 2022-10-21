import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { next } from "@effect/core/io/Scope/ReleaseMap/operations/_internal/next"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects addIfOpen
 * @tsplus pipeable effect/core/io/ReleaseMap addIfOpen
 */
export function addIfOpen(finalizer: Scope.Finalizer) {
  return (self: ReleaseMap): Effect<never, never, Maybe<number>> =>
    self.ref
      .modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return [
              finalizer(s.exit).map(() => Maybe.none),
              new Exited(next(s.nextKey), s.exit, s.update)
            ] as const
          }
          case "Running": {
            const finalizers = s.finalizers().set(s.nextKey, finalizer)
            return [
              Effect.succeed(Maybe.some(s.nextKey)),
              new Running(next(s.nextKey), finalizers, s.update)
            ] as const
          }
        }
      })
      .flatten
}
