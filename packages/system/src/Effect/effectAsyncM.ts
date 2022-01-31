// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import { pipe } from "../Function/index.js"
import * as catchAllCause from "./catchAllCause.js"
import { fork } from "./core.js"
import * as Do from "./do.js"
import type { Effect } from "./effect.js"
import * as P from "./excl-forEach-promise.js"
import { uninterruptibleMask } from "./interruption.js"
import * as map from "./map.js"
import { runtime } from "./runtime.js"
import * as to from "./to.js"
import * as zips from "./zips.js"

/**
 * Imports an asynchronous effect into a pure `Effect` value. This formulation is
 * necessary when the effect is itself expressed in terms of `Effect`.
 */
export function effectAsyncM<R, E, R2, E2, A, X>(
  register: (cb: (_: Effect<R2, E2, A>) => void) => Effect<R, E, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return pipe(
    Do.do,
    Do.bind("p", () => P.make<E | E2, A>()),
    Do.bind("r", () => runtime<R & R2>()),
    Do.bind("a", ({ p, r }) =>
      uninterruptibleMask(({ restore }) =>
        pipe(
          fork(
            restore(
              pipe(
                register((k) => {
                  r.run(to.to(p)(k))
                }),
                catchAllCause.catchAllCause((c) => P.halt(<Cause<E | E2>>c)(p))
              )
            ),
            __trace
          ),
          zips.zipRight(restore(P.await(p)))
        )
      )
    ),
    map.map(({ a }) => a)
  )
}
