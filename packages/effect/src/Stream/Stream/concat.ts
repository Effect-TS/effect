import * as C from "../../Cause"
import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O | O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("currStream", () =>
        T.toManaged_(
          Ref.makeRef<T.Effect<R & R1, O.Option<E | E1>, A.Chunk<O | O1>>>(Pull.end)
        )
      ),
      M.bind("switchStream", () =>
        M.switchable<
          R & R1,
          never,
          T.Effect<R & R1, O.Option<E | E1>, A.Chunk<O | O1>>
        >()
      ),
      M.bind("switched", () => T.toManaged_(Ref.makeRef(false))),
      M.tap(({ currStream, switchStream }) =>
        T.toManaged_(T.chain_(switchStream(self.proc), currStream.set))
      ),
      M.let("pull", ({ currStream, switchStream, switched }) => {
        const go: T.Effect<
          R & R1,
          O.Option<E | E1>,
          A.Chunk<O | O1>
        > = T.catchAllCause_(T.flatten(currStream.get), (_) =>
          O.fold_(
            C.sequenceCauseOption(_),
            () =>
              T.chain_(Ref.getAndSet_(switched, true), (_) => {
                if (_) {
                  return Pull.end
                } else {
                  return T.andThen_(
                    T.chain_(switchStream(that.proc), currStream.set),
                    go
                  )
                }
              }),
            (e) => Pull.halt(e)
          )
        )

        return go
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat<R1, E1, O1>(that: Stream<R1, E1, O1>) {
  return <R, E, O>(self: Stream<R, E, O>) => concat_(self, that)
}
