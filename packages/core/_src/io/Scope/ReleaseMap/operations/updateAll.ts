import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects updateAll
 * @tsplus pipeable effect/core/io/ReleaseMap updateAll
 */
export function updateAll(
  f: (finalizer: Scope.Finalizer) => Scope.Finalizer,
  __tsplusTrace?: string
) {
  return (self: ReleaseMap): Effect<never, never, void> =>
    self.ref.update((state) => {
      switch (state._tag) {
        case "Exited": {
          return new Exited(state.nextKey, state.exit, (_) => f(state.update(_)))
        }
        case "Running": {
          return new Running(state.nextKey, state.finalizers(), (_) => f(state.update(_)))
        }
      }
    })
}
