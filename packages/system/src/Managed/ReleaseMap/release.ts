// ets_tracing: off

import { lookup, remove } from "../../Collections/Immutable/Map/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../deps-core"
import * as R from "./deps-ref"
import type { ReleaseMap } from "./ReleaseMap"
import { Running } from "./Running"

export function release(key: number, exit: T.Exit<any, any>) {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      R.modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return Tp.tuple(T.unit, s)
          }
          case "Running": {
            return Tp.tuple(
              O.fold_(
                lookup(key)(s.finalizers()),
                () => T.unit,
                (f) => f(exit)
              ),
              new Running(s.nextKey, remove(key)(s.finalizers()))
            )
          }
        }
      }),
      T.flatten
    )
}
