import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import * as Take from "../Take"
import { Stream } from "./definitions"
import { toQueue_ } from "./toQueue"

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
      M.bind("done", () => T.toManaged_(Ref.makeRef(false))),
      M.bind("queue", () => toQueue_(self, capacity)),
      M.map(({ done, queue }) => {
        return pipe(
          done.get,
          T.chain((_) => {
            if (_) {
              return Pull.end
            } else {
              return pipe(
                queue.take,
                T.chain((_) => Take.done(_)),
                T.catchSome((_) => {
                  if (O.isNone(_)) {
                    return O.some(T.andThen_(done.set(true), Pull.end))
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
