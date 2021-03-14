// tracing: off

import { pipe } from "../../Function"
import { insert } from "../../Map/core"
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
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(next(s.nextKey), s.exit)
            ]
          }
          case "Running": {
            return [
              T.succeed(O.some(s.nextKey)),
              new Running(next(s.nextKey), insert(s.nextKey, finalizer)(s.finalizers()))
            ]
          }
        }
      }),
      T.flatten
    )
}
