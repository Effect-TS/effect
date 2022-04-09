import { concreteDeferred } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal";
import { DeferredState } from "@effect/core/io/Deferred/operations/_internal/DeferredState";
import { interruptJoiner } from "@effect/core/io/Deferred/operations/_internal/interruptJoiner";

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 *
 * @tsplus fluent ets/Deferred await
 */
export function _await<E, A>(self: Deferred<E, A>, __tsplusTrace?: string): IO<E, A> {
  concreteDeferred(self);
  return Effect.asyncInterruptBlockingOn((k) => {
    const state = self.state.get;

    switch (state._tag) {
      case "Done": {
        return Either.right(state.value);
      }
      case "Pending": {
        self.state.set(DeferredState.pending([k, ...state.joiners]));
        return Either.left(interruptJoiner(self, k));
      }
    }
  }, self.blockingOn);
}

export { _await as await };
