// ets_tracing: off

import { insert } from "../../Collections/Immutable/Map/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../deps-core"
import * as R from "./deps-ref"
import { Exited } from "./Exited"
import type { Finalizer } from "./finalizer"
import { next } from "./next"
import type { ReleaseMap } from "./ReleaseMap"
import { Running } from "./Running"
import type { State } from "./State"

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
