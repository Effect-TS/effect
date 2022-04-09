import { concreteDeferred } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal";

/**
 * Checks for completion of this `Deferred`. Returns the result effect if this
 * deferred has already been completed or a `None` otherwise.
 *
 * @tsplus fluent ets/Deferred poll
 */
export function poll<E, A>(
  self: Deferred<E, A>,
  __tsplusTrace?: string
): UIO<Option<IO<E, A>>> {
  return Effect.succeed(() => {
    concreteDeferred(self);
    const state = self.state.get;
    switch (state._tag) {
      case "Pending": {
        return Option.none;
      }
      case "Done": {
        return Option.some(state.value);
      }
    }
  });
}
