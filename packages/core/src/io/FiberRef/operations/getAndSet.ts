import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 */
export function getAndSet_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  value: A,
  __tsplusTrace?: string
): IO<EA | EB, A> {
  return modify_(self, (v) => Tuple(v, value))
}

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> =>
    getAndSet_(self, value)
}
