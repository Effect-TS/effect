import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
/**
 * Removes the finalizer associated with this key and returns it.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects remove
 * @tsplus pipeable effect/core/io/ReleaseMap remove
 */
export function remove(key: number, __tsplusTrace?: string) {
  return (self: ReleaseMap): Effect<never, never, Maybe<Scope.Finalizer>> =>
    self.ref.modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return Tuple(Maybe.none, new Exited(s.nextKey, s.exit, s.update))
        }
        case "Running": {
          const finalizers = s.finalizers()
          const finalizer = Maybe.fromNullable(finalizers.get(key))
          finalizers.delete(key)
          return Tuple(finalizer, new Running(s.nextKey, finalizers, s.update))
        }
      }
    })
}
