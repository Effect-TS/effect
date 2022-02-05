// ets_tracing: off

import { lookup, remove } from "../../Collections/Immutable/Map/core.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../deps-core.js"
import * as R from "./deps-ref.js"
import type { ReleaseMap } from "./ReleaseMap.js"
import { Running } from "./Running.js"

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
