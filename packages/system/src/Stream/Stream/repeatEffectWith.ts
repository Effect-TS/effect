// tracing: off

import type * as CL from "../../Clock"
import * as O from "../../Option"
import * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import { chain_ } from "./chain"
import { concat_ } from "./concat"
import type { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"
import { succeed } from "./succeed"
import { unfoldM } from "./unfoldM"

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith<R, R1, E, A extends A1, A1, X>(
  effect: T.Effect<R, E, A>,
  schedule: SC.Schedule<R1, A1, X>
): Stream<R & R1 & CL.HasClock, E, A> {
  return chain_(fromEffect(T.zip_(effect, SC.driver(schedule))), ([a, driver]) =>
    concat_(
      succeed(a),
      unfoldM(a)((_) =>
        T.foldM_(driver.next(_), T.succeed, (_) =>
          T.map_(effect, (nextA) => O.some([nextA, nextA] as const))
        )
      )
    )
  )
}
