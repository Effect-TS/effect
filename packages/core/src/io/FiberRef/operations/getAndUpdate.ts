import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @tsplus fluent ets/XFiberRef getAndUpdate
 * @tsplus fluent ets/XFiberRefRuntime getAndUpdate
 */
export function getAndUpdate_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): IO<EA | EB, A> {
  return self.modify((v) => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> => self.getAndUpdate(f)
}
