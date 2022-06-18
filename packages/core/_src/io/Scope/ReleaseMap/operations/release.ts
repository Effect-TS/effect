import { Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @tsplus fluent ets/ReleaseMap release
 */
export function release_(
  self: ReleaseMap,
  key: number,
  exit: Exit<any, any>,
  __tsplusTrace?: string
): Effect<never, never, any> {
  return self.ref
    .modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return Tuple(Effect.unit, s)
        }
        case "Running": {
          const finalizers = s.finalizers()
          const finalizer = Maybe.fromNullable(finalizers.get(key))
          finalizers.delete(key)
          return Tuple(
            finalizer.fold(
              () => Effect.unit,
              (fin) => s.update(fin)(exit)
            ),
            new Running(s.nextKey, finalizers, s.update)
          )
        }
      }
    })
    .flatten()
}

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @tsplus static ets/ReleaseMap/Aspects release
 */
export const release = Pipeable(release_)
