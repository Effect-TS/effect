// ets_tracing: off

import { insert, lookup } from "../../Collections/Immutable/Map/core.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { absurd, pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../deps.js"
import * as R from "./deps-ref.js"
import { Exited } from "./Exited.js"
import type { Finalizer } from "./finalizer.js"
import type { ReleaseMap } from "./ReleaseMap.js"
import { Running } from "./Running.js"
import type { State } from "./State.js"

export function replace(key: number, finalizer: Finalizer) {
  return (_: ReleaseMap): T.Effect<unknown, never, O.Option<Finalizer>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<unknown, never, O.Option<Finalizer>>, State>((s) => {
        switch (s._tag) {
          case "Exited":
            return Tp.tuple(
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(s.nextKey, s.exit)
            )
          case "Running":
            return Tp.tuple(
              T.succeed(lookup(key)(s.finalizers())),
              new Running(s.nextKey, insert(key, finalizer)(s.finalizers()))
            )
          default:
            return absurd(s)
        }
      }),
      T.flatten
    )
}
