// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"
import { empty } from "./empty.js"

/**
 * Takes the specified number of elements from this stream.
 */
export function take_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  if (n <= 0) {
    return empty
  } else {
    return new Stream(
      pipe(
        M.do,
        M.bind("chunks", () => self.proc),
        M.bind("counterRef", () => T.toManaged(Ref.makeRef(0))),
        M.let("pull", ({ chunks, counterRef }) =>
          T.chain_(counterRef.get, (cnt) => {
            if (cnt >= n) {
              return Pull.end
            } else {
              return pipe(
                T.do,
                T.bind("chunk", () => chunks),
                T.let("taken", ({ chunk }) => {
                  if (A.size(chunk) <= n - cnt) {
                    return chunk
                  } else {
                    return A.take_(chunk, n - cnt)
                  }
                }),
                T.tap(({ taken }) => counterRef.set(cnt + A.size(taken))),
                T.map(({ taken }) => taken)
              )
            }
          })
        ),
        M.map(({ pull }) => pull)
      )
    )
  }
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => take_(self, n)
}
