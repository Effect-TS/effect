import { Option, some } from "fp-ts/lib/Option"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { applySecond } from "./applySecond"
import { completed } from "./completed"
import { map_ } from "./map"
import { pureNone } from "./pureNone"
import { timeoutFold } from "./timeoutFold"

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export function timeoutOption<S, R, E, A>(
  source: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R, E, Option<A>> {
  return timeoutFold(
    source,
    ms,
    (actionFiber) => applySecond(actionFiber.interrupt, pureNone),
    (exit) => map_(completed(exit), some)
  )
}
