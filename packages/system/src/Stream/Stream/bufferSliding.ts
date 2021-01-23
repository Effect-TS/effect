import { pipe } from "../../Function"
import type * as P from "../../Promise"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Take from "../Take"
import { bufferSignal } from "./_internal/bufferSignal"
import { Stream } from "./definitions"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a sliding queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferSliding_<R, E, O>(
  self: Stream<R, E, O>,
  capacity: number
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("queue", () =>
        T.toManaged_(
          Q.makeSliding<readonly [Take.Take<E, O>, P.Promise<never, void>]>(capacity),
          (q) => q.shutdown
        )
      ),
      M.chain(({ queue }) => bufferSignal(self, queue))
    )
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a sliding queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferSliding(capacity: number) {
  return <R, E, O>(self: Stream<R, E, O>) => bufferSliding_(self, capacity)
}
