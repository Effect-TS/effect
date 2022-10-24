import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { next } from "@effect/core/io/Scope/ReleaseMap/operations/_internal/next"
import * as Option from "@fp-ts/data/Option"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects addIfOpen
 * @tsplus pipeable effect/core/io/ReleaseMap addIfOpen
 * @category mutations
 * @since 1.0.0
 */
export function addIfOpen(finalizer: Scope.Finalizer) {
  return (self: ReleaseMap): Effect<never, never, Option.Option<number>> =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Exited": {
            return [
              finalizer(state.exit).map(() => Option.none),
              new Exited(next(state.nextKey), state.exit, state.update)
            ] as const
          }
          case "Running": {
            const finalizers = state.finalizers().set(state.nextKey, finalizer)
            return [
              Effect.succeed(Option.some(state.nextKey)),
              new Running(next(state.nextKey), finalizers, state.update)
            ] as const
          }
        }
      })
      .flatten
}
