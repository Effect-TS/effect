// ets_tracing: off

import type { Cause } from "../Cause"
import { pipe } from "../Function"
import * as P from "../Promise"
import * as catchAllCause from "./catchAllCause"
import { fork } from "./core"
import * as Do from "./do"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./interruption"
import * as map from "./map"
import { runtime } from "./runtime"
import * as to from "./to"
import * as zips from "./zips"

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
