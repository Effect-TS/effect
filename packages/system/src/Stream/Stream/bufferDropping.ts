// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type * as P from "../../Promise/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as Take from "../Take/index.js"
import { bufferSignal } from "./_internal/bufferSignal.js"
import { Stream } from "./definitions.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a dropping queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferDropping_<R, E, O>(
  self: Stream<R, E, O>,
  capacity: number
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("queue", () =>
        T.toManagedRelease_(
          Q.makeDropping<Tp.Tuple<[Take.Take<E, O>, P.Promise<never, void>]>>(capacity),
          Q.shutdown
        )
      ),
      M.chain(({ queue }) => bufferSignal(self, queue))
    )
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a dropping queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferDropping(capacity: number) {
  return <R, E, O>(self: Stream<R, E, O>) => bufferDropping_(self, capacity)
}
