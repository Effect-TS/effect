// ets_tracing: off

import { insert } from "../../Collections/Immutable/Map/core.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../deps-core.js"
import * as R from "./deps-ref.js"
import { Exited } from "./Exited.js"
import type { Finalizer } from "./finalizer.js"
import { next } from "./next.js"
import type { ReleaseMap } from "./ReleaseMap.js"
import { Running } from "./Running.js"
import type { State } from "./State.js"

export function addIfOpen(finalizer: Finalizer) {
  return (_: ReleaseMap): T.Effect<unknown, never, O.Option<number>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<unknown, never, O.Option<number>>, State>((s) => {
        switch (s._tag) {
          case "Exited": {
            return Tp.tuple(
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(next(s.nextKey), s.exit)
            )
          }
          case "Running": {
            return Tp.tuple(
              T.succeed(O.some(s.nextKey)),
              new Running(next(s.nextKey), insert(s.nextKey, finalizer)(s.finalizers()))
            )
          }
        }
      }),
      T.flatten
    )
}
