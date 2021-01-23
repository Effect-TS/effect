import * as C from "../../Cause"
import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

export function forever<R, E, O>(self: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("currStream", () =>
        T.toManaged_(Ref.makeRef<T.Effect<R, O.Option<E>, A.Chunk<O>>>(Pull.end))
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>()
      ),
      M.tap(({ currStream, switchStream }) => {
        return T.toManaged_(T.chain_(switchStream(self.proc), currStream.set))
      }),
      M.map(({ currStream, switchStream }) => {
        const go: T.Effect<R, O.Option<E>, A.Chunk<O>> = T.catchAllCause_(
          T.flatten(currStream.get),
          (_) =>
            O.fold_(
              C.sequenceCauseOption(_),
              () => T.andThen_(T.chain_(switchStream(self.proc), currStream.set), go),
              (e) => Pull.halt(e)
            )
        )

        return go
      })
    )
  )
}
