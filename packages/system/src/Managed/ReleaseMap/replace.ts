import { absurd, pipe } from "../../Function"
import { insert, lookup } from "../../Map/core"
import * as O from "../../Option"
import * as T from "../deps"
import * as R from "./deps-ref"
import { Exited } from "./Exited"
import type { Finalizer } from "./finalizer"
import type { ReleaseMap } from "./ReleaseMap"
import { Running } from "./Running"
import type { State } from "./State"

export function replace(key: number, finalizer: Finalizer) {
  return (_: ReleaseMap): T.Effect<unknown, never, O.Option<Finalizer>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<unknown, never, O.Option<Finalizer>>, State>((s) => {
        switch (s._tag) {
          case "Exited":
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(s.nextKey, s.exit)
            ]
          case "Running":
            return [
              T.succeed(lookup(key)(s.finalizers())),
              new Running(s.nextKey, insert(key, finalizer)(s.finalizers()))
            ]
          default:
            return absurd(s)
        }
      }),
      T.flatten
    )
}
