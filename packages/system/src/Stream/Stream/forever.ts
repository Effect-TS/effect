// ets_tracing: off

import * as C from "../../Cause/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Pull from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

export function forever<R, E, O>(self: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("currStream", () =>
        T.toManaged(Ref.makeRef<T.Effect<R, O.Option<E>, A.Chunk<O>>>(Pull.end))
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>()
      ),
      M.tap(({ currStream, switchStream }) => {
        return T.toManaged(T.chain_(switchStream(self.proc), currStream.set))
      }),
      M.map(({ currStream, switchStream }) => {
        const go: T.Effect<R, O.Option<E>, A.Chunk<O>> = T.catchAllCause_(
          T.flatten(currStream.get),
          (_) =>
            O.fold_(
              C.sequenceCauseOption(_),
              () => T.zipRight_(T.chain_(switchStream(self.proc), currStream.set), go),
              (e) => Pull.halt(e)
            )
        )

        return go
      })
    )
  )
}
