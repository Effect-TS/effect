import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { next } from "@effect/core/io/Scope/ReleaseMap/operations/_internal/next"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 *
 * @tsplus fluent ets/ReleaseMap addIfOpen
 */
export function addIfOpen_(
  self: ReleaseMap,
  finalizer: Scope.Finalizer,
  __tsplusTrace?: string
): Effect.UIO<Option<number>> {
  return self.ref
    .modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return Tuple(
            finalizer(s.exit).map(() => Option.none),
            new Exited(next(s.nextKey), s.exit, s.update)
          )
        }
        case "Running": {
          const finalizers = s.finalizers().set(s.nextKey, finalizer)
          return Tuple(
            Effect.succeed(() => Option.some(s.nextKey)),
            new Running(next(s.nextKey), finalizers, s.update)
          )
        }
      }
    })
    .flatten()
}

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 *
 * @tsplus static ets/ReleaseMap/Aspects addIfOpen
 */
export const addIfOpen = Pipeable(addIfOpen_)
