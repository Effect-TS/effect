// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as BP from "../BufferedPull/index.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"
import { empty } from "./empty.js"

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
        M.bind("queue", () => T.toManaged(Q.makeSliding<O>(n))),
        M.bind("done", () => Ref.makeManagedRef(false)),
        M.map(({ done, pull, queue }) =>
          T.chain_(done.get, (_) => {
            if (_) {
              return Pull.end
            } else {
              return pipe(
                BP.pullElement(pull),
                T.tap((x) => Q.offer_(queue, x)),
                T.as(A.empty<O>()),
                T.catchSome(
                  O.fold(
                    () => O.some(T.zipRight_(done.set(true), Q.takeAll(queue))),
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
