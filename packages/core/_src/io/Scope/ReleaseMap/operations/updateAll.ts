import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State";

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 *
 * @tsplus fluent ets/ReleaseMap updateAll
 */
export function updateAll_(
  self: ReleaseMap,
  f: (finalizer: Scope.Finalizer) => Scope.Finalizer,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return self.ref.update((state) => {
    switch (state._tag) {
      case "Exited": {
        return new Exited(state.nextKey, state.exit, (_) => f(state.update(_)));
      }
      case "Running": {
        return new Running(state.nextKey, state.finalizers(), (_) => f(state.update(_)));
      }
    }
  });
}

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 *
 * @tsplus static ets/ReleaseMap/Aspects updateAll
 */
export const updateAll = Pipeable(updateAll_);
