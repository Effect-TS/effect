import { concreteDeferred } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal";
import { DeferredState } from "@effect/core/io/Deferred/operations/_internal/DeferredState";

/**
 * Unsafe version of `done`.
 *
 * @tsplus fluent ets/Deferred unsafeDone
 */
export function unsafeDone_<E, A>(self: Deferred<E, A>, effect: IO<E, A>): void {
  concreteDeferred(self);
  const state = self.state.get;
  if (state._tag === "Pending") {
    self.state.set(DeferredState.done(effect));
    Array.from(state.joiners)
      .reverse()
      .forEach((f) => {
        f(effect);
      });
  }
}

/**
 * Unsafe version of `done`.
 *
 * @tsplus static ets/Deferred/Aspects unsafeDone
 */
export const unsafeDone = Pipeable(unsafeDone_);
