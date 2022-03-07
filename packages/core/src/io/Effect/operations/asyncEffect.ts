import type { Cause } from "../../Cause"
import { Promise } from "../../Promise"
import { Effect } from "../definition"
import type { Cb } from "./Cb"
import { runtime } from "./runtime"

/**
 * Imports an asynchronous effect into a pure `Effect` value. This formulation
 * is necessary when the effect is itself expressed in terms of an `Effect`.
 *
 * @tsplus static ets/EffectOps asyncEffect
 */
export function asyncEffect<R2, E2, R, E, A, X>(
  register: (callback: Cb<Effect<R2, E2, A>>) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A> {
  return Effect.Do()
    .bind("promise", () => Promise.make<E | E2, A>())
    .bind("runtime", () => runtime<R & R2>())
    .flatMap(({ promise, runtime }) =>
      Effect.uninterruptibleMask(
        ({ restore }) =>
          restore(
            register((k) =>
              runtime.unsafeRunAsync(k.intoPromise(promise))
            ).catchAllCause((cause) => promise.failCause(cause as Cause<E | E2>))
          ).fork() > restore(promise.await())
      )
    )
}
