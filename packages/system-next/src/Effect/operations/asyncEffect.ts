import type { Cause } from "../../Cause"
import { pipe } from "../../Function"
import * as Promise from "../../Promise"
import type { Effect } from "../definition"
import { catchAllCause } from "./catchAllCause"
import type { Cb } from "./Cb"
import * as Do from "./do"
import { fork } from "./fork"
import { uninterruptibleMask } from "./interruption"
import { intoPromise_ } from "./intoPromise"
import { map } from "./map"
import { runtime } from "./runtime"
import { zipRight } from "./zipRight"

/**
 * Imports an asynchronous effect into a pure `ZIO` value. This formulation is
 * necessary when the effect is itself expressed in terms of `ZIO`.
 *
 * @ets static ets/EffectOps asyncEffect
 */
export function asyncEffect<R2, E2, R, E, A, X>(
  register: (callback: Cb<Effect<R2, E2, A>>) => Effect<R, E, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return pipe(
    Do.Do(),
    Do.bind("promise", () => Promise.make<E | E2, A>()),
    Do.bind("runtime", () => runtime<R & R2>()),
    Do.bind("a", ({ promise, runtime }) =>
      uninterruptibleMask((status) =>
        pipe(
          fork(
            status.restore(
              pipe(
                register((k) => runtime.unsafeRunAsync(intoPromise_(k, promise))),
                catchAllCause((cause) =>
                  Promise.failCause_(promise, cause as Cause<E | E2>)
                )
              )
            ),
            __trace
          ),
          zipRight(status.restore(Promise.await(promise)))
        )
      )
    ),
    map(({ a }) => a)
  )
}
