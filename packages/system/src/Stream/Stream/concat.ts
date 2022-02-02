// ets_tracing: off

import * as C from "../../Cause/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Ref from "../../Ref/index.js"
import * as Pull from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

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
        T.toManaged(
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
      M.bind("switched", () => T.toManaged(Ref.makeRef(false))),
      M.tap(({ currStream, switchStream }) =>
        T.toManaged(T.chain_(switchStream(self.proc), currStream.set))
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
                  return T.zipRight_(
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
