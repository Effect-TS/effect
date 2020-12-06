import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("counterRef", () => T.toManaged_(Ref.makeRef(0))),
      M.let("pull", ({ chunks, counterRef }) => {
        const go: T.Effect<R, O.Option<E>, A.Chunk<O>> = T.chain_(chunks, (chunk) =>
          T.chain_(counterRef.get, (cnt) => {
            if (cnt >= n) {
              return T.succeed(chunk)
            } else if (chunk.length <= n - cnt) {
              return T.andThen_(counterRef.set(cnt + chunk.length), go)
            } else {
              return T.as_(counterRef.set(cnt + (n - cnt)), A.dropLeft_(chunk, n - cnt))
            }
          })
        )

        return go
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => drop_(self, n)
}
