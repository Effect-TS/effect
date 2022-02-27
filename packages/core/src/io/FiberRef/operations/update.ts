import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 *
 * @tsplus fluent ets/XFiberRef update
 * @tsplus fluent ets/XFiberRefRuntime update
 */
export function update_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): IO<EA | EB, void> {
  return self.modify((v) => Tuple(undefined, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, void> => self.update(f)
}
