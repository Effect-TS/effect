import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as BP from "../BufferedPull"
import * as Pull from "../Pull"
import { Stream } from "./definitions"
import { empty } from "./empty"

/**
 * Takes the last specified number of elements from this stream.
 */
export function takeRight_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  if (n <= 0) {
    return empty
  } else {
    return new Stream(
      pipe(
        M.do,
        M.bind("pull", () => M.mapM_(self.proc, BP.make)),
        M.bind("queue", () => T.toManaged_(Q.makeSliding<O>(n))),
        M.bind("done", () => Ref.makeManagedRef(false)),
        M.map(({ done, pull, queue }) =>
          T.chain_(done.get, (_) => {
            if (_) {
              return Pull.end
            } else {
              return pipe(
                BP.pullElement(pull),
                T.tap(queue.offer),
                T.as(A.empty),
                T.catchSome(
                  O.fold(
                    () =>
                      O.some(
                        T.andThen_(
                          done.set(true),
                          T.map_(queue.takeAll, A.fromIterable)
                        )
                      ),
                    () => O.none
                  )
                )
              )
            }
          })
        )
      )
    )
  }
}

/**
 * Takes the last specified number of elements from this stream.
 */
export function takeRight(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => takeRight_(self, n)
}
