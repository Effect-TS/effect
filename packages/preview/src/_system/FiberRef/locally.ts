import { bracket_ } from "../Effect/bracket_"
import { chain } from "../Effect/core"
import { Effect } from "../Effect/effect"
import { pipe } from "../Function"

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
      bracket_(
        set(value)(fiberRef),
        () => use,
        () => set(oldValue)(fiberRef)
      )
    )
  )
