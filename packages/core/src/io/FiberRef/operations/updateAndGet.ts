import { Tuple } from "../../../collection/immutable/Tuple"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the result.
 *
 * @tsplus fluent ets/XFiberRef updateAndGet
 * @tsplus fluent ets/XFiberRefRuntime updateAndGet
 */
export function updateAndGet_<EA, EB, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): IO<EA | EB, A> {
  return self.modify((v) => {
    const result = f(v)
    return Tuple(result, result)
  })
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the result.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, A> => self.updateAndGet(f)
}
