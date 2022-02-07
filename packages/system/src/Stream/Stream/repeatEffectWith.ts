// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as O from "../../Option/index.js"
import * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import { chain_ } from "./chain.js"
import { concat_ } from "./concat.js"
import type { Stream } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"
import { succeed } from "./succeed.js"
import { unfoldM } from "./unfoldM.js"

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith<R, R1, E, A extends A1, A1, X>(
  effect: T.Effect<R, E, A>,
  schedule: SC.Schedule<R1, A1, X>
): Stream<R & R1 & CL.HasClock, E, A> {
  return chain_(
    fromEffect(T.zip_(effect, SC.driver(schedule))),
    ({ tuple: [a, driver] }) =>
      concat_(
        succeed(a),
        unfoldM(a, (_) =>
          T.foldM_(driver.next(_), T.succeed, (_) =>
            T.map_(effect, (nextA) => O.some(Tp.tuple(nextA, nextA)))
          )
        )
      )
  )
}
