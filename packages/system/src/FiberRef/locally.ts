import { bracket_ } from "../Effect/bracket_"
import { chain } from "../Effect/core"
import type { Effect } from "../Effect/effect"
import { pipe } from "../Function"
import type { FiberRef } from "./fiberRef"
import { get } from "./get"
import { set } from "./set"

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export const locally = <A>(value: A) => <R, E, B>(use: Effect<R, E, B>) => (
  fiberRef: FiberRef<A>
): Effect<R, E, B> =>
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
