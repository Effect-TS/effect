import * as T from "../../Effect"
import type * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as BP from "../../Stream/BufferedPull"
import * as P from "../../Stream/Pull"
import { Stream } from "./definitions"

export function flattenExitOption<R, E, E1, O1>(
  self: Stream<R, E, Ex.Exit<O.Option<E1>, O1>>
): Stream<R, E | E1, O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("upstream", () => M.mapM_(self.proc, BP.make)),
      M.bind("done", () => T.toManaged_(Ref.makeRef(false))),
      M.map(({ done, upstream }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return P.end
          } else {
            return T.foldM_(
              BP.pullElement(upstream),
              O.fold(
                () => T.andThen_(done.set(true), P.end),
                (e) => P.fail<E | E1>(e)
              ),
              (os) =>
                T.foldM_(
                  T.done(os),
                  O.fold(
                    () => T.andThen_(done.set(true), P.end),
                    (e) => P.fail(e)
                  ),
                  (_) => P.emit(_)
                )
            )
          }
        })
      )
    )
  )
}
