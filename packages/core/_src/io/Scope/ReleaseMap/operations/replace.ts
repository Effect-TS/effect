import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * @tsplus fluent ets/ReleaseMap replace
 */
export function replace_(
  self: ReleaseMap,
  key: number,
  finalizer: Scope.Finalizer,
  __tsplusTrace?: string
): Effect.UIO<Maybe<Scope.Finalizer>> {
  return self.ref
    .modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return Tuple(
            finalizer(s.exit).map(() => Maybe.none),
            new Exited(s.nextKey, s.exit, s.update)
          )
        }
        case "Running": {
          const finalizers = s.finalizers()
          const oldFinalizer = Maybe.fromNullable(finalizers.get(key))
          const newFinalizers = finalizers.set(key, finalizer)
          return Tuple(
            Effect.succeed(oldFinalizer),
            new Running(s.nextKey, newFinalizers, s.update)
          )
        }
      }
    })
    .flatten()
}

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * @tsplus static ets/ReleaseMap/Aspects replace
 */
export const replace = Pipeable(replace_)
