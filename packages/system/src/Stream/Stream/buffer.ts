// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import * as Ref from "../../Ref/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Pull from "../Pull/index.js"
import * as Take from "../Take/index.js"
import { Stream } from "./definitions.js"
import { toQueue_ } from "./toQueue.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer_<R, E, O>(
  self: Stream<R, E, O>,
  capacity: number
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("done", () => T.toManaged(Ref.makeRef(false))),
      M.bind("queue", () => toQueue_(self, capacity)),
      M.map(({ done, queue }) => {
        return pipe(
          done.get,
          T.chain((_) => {
            if (_) {
              return Pull.end
            } else {
              return pipe(
                Q.take(queue),
                T.chain((_) => Take.done(_)),
                T.catchSome((_) => {
                  if (O.isNone(_)) {
                    return O.some(T.zipRight_(done.set(true), Pull.end))
                  }

                  return O.none
                })
              )
            }
          })
        )
      })
    )
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer(capacity: number) {
  return <R, E, O>(self: Stream<R, E, O>) => buffer_(self, capacity)
}
