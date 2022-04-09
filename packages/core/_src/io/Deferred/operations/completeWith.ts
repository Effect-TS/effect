import { concreteDeferred } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal";
import { DeferredState } from "@effect/core/io/Deferred/operations/_internal/DeferredState";

/**
 * Completes the deferred with the specified effect. If the deferred has
 * already been completed, the method will produce false.
 *
 * Note that since the deferred is completed with an effect, the effect will
 * be evaluated each time the value of the deferred is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case the meaning of the "exactly once" guarantee of `Deferred` is that the
 * deferred can be completed with exactly one effect. For a version that
 * completes the deferred with the result of an effect see `Deferred.complete`.
 *
 * @tsplus fluent ets/Deferred completeWith
 */
export function completeWith_<E, A>(
  self: Deferred<E, A>,
  effect: IO<E, A>,
  __tsplusTrace?: string
): UIO<boolean> {
  concreteDeferred(self);
  return Effect.succeed(() => {
    const state = self.state.get;
    switch (state._tag) {
      case "Done": {
        return false;
      }
      case "Pending": {
        self.state.set(DeferredState.done(effect));
        state.joiners.forEach((f) => {
          f(effect);
        });
        return true;
      }
    }
  });
}

/**
 * Completes the deferred with the specified effect. If the deferred has
 * already been completed, the method will produce false.
 *
 * Note that since the deferred is completed with an effect, the effect will
 * be evaluated each time the value of the deferred is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case the meaning of the "exactly once" guarantee of `Deferred` is that the
 * deferred can be completed with exactly one effect. For a version that
 * completes the deferred with the result of an effect see `Deferred.complete`.
 *
 * @tsplus static ets/Deferred/Aspects completeWith
 */
export const completeWith = Pipeable(completeWith_);
