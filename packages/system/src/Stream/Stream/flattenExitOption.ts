// ets_tracing: off

import type * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import * as P from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

export function flattenExitOption<R, E, E1, O1>(
  self: Stream<R, E, Ex.Exit<O.Option<E1>, O1>>
): Stream<R, E | E1, O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("upstream", () => M.mapM_(self.proc, BP.make)),
      M.bind("done", () => T.toManaged(Ref.makeRef(false))),
      M.map(({ done, upstream }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return P.end
          } else {
            return T.foldM_(
              BP.pullElement(upstream),
              O.fold(
                () => T.zipRight_(done.set(true), P.end),
                (e) => P.fail<E | E1>(e)
              ),
              (os) =>
                T.foldM_(
                  T.done(os),
                  O.fold(
                    () => T.zipRight_(done.set(true), P.end),
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
