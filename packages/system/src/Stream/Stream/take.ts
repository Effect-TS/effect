import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"
import { empty } from "./empty"

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
        M.bind("counterRef", () => T.toManaged_(Ref.makeRef(0))),
        M.let("pull", ({ chunks, counterRef }) =>
          T.chain_(counterRef.get, (cnt) => {
            if (cnt >= n) {
              return Pull.end
            } else {
              return pipe(
                T.do,
                T.bind("chunk", () => chunks),
                T.let("taken", ({ chunk }) => {
                  if (chunk.length <= n - cnt) {
                    return chunk
                  } else {
                    return A.takeLeft_(chunk, n - cnt)
                  }
                }),
                T.tap(({ taken }) => counterRef.set(cnt + taken.length)),
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
