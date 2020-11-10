import * as C from "../../Cause"
import * as T from "../../Effect"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as P from "../../Stream/Pull"
import { Stream } from "./definitions"

export function forever<R, E, O>(self: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("currStream", () =>
        T.toManaged_(Ref.makeRef<T.Effect<R, O.Option<E>, readonly O[]>>(P.end))
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, readonly O[]>>()
      ),
      M.tap(({ currStream, switchStream }) => {
        return T.toManaged_(T.chain_(switchStream(self.proc), currStream.set))
      }),
      M.map(({ currStream, switchStream }) => {
        const go: T.Effect<R, O.Option<E>, readonly O[]> = T.catchAllCause_(
          T.flatten(currStream.get),
          (_) =>
            O.fold_(
              C.sequenceCauseOption(_),
              () => T.andThen_(T.chain_(switchStream(self.proc), currStream.set), go),
              (e) => P.halt(e)
            )
        )

        return go
      })
    )
  )
}
