// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple"
import type { UIO } from "../Effect/effect"
import { pipe } from "../Function"
import type { FiberRef } from "./fiberRef"
import { modify } from "./modify"
/**
 * Sets the value associated with the current fiber.
 *
 * @ets_data_first set_
 */
export function set<A>(a: A) {
  return (fiberRef: FiberRef<A>): UIO<void> => set_(fiberRef, a)
}

/**
 * Sets the value associated with the current fiber.
 */
export function set_<A>(fiberRef: FiberRef<A>, a: A): UIO<void> {
  return pipe(
    fiberRef,
    modify((_) => Tp.tuple(undefined, a))
  )
}
