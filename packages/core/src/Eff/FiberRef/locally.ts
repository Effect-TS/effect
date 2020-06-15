import { pipe } from "../../Function"
import { bracket } from "../Effect/bracket"
import { chain } from "../Effect/chain"
import { Effect } from "../Effect/effect"

import { FiberRef } from "./fiberRef"
import { get } from "./get"
import { set } from "./set"

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export const locally = <A>(value: A) => <S, R, E, B>(use: Effect<S, R, E, B>) => (
  fiberRef: FiberRef<A>
): Effect<S, R, E, B> =>
  pipe(
    get(fiberRef),
    chain((oldValue) =>
      bracket(
        set(value)(fiberRef),
        () => set(oldValue)(fiberRef),
        () => use
      )
    )
  )
