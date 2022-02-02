// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as Chain from "./chain"
import * as Concat from "./concat"
import * as FromEffect from "./fromEffect"
import * as Succeed from "./succeed"
import * as UnfoldEffect from "./unfoldEffect"

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith<R, E, A>(
  effect: T.Effect<R, E, A>,
  schedule: SC.Schedule<R, A, any>
): C.Stream<R & CL.HasClock, E, A> {
  return Chain.chain_(
    FromEffect.fromEffect(T.zip_(effect, SC.driver(schedule))),
    ({ tuple: [a, driver] }) =>
      Concat.concat_(
        Succeed.succeed(a),
        UnfoldEffect.unfoldEffect(a, (_) =>
          T.foldM_(
            driver.next(_),
            (_) => T.succeed(_),
            (_) => T.map_(effect, (nextA) => O.some(Tp.tuple(nextA, nextA)))
          )
        )
      )
  )
}
