// tracing: off

import { pipe } from "../../Function"
import { lookup, remove } from "../../Map/core"
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
            return [T.unit, s]
          }
          case "Running": {
            return [
              O.fold_(
                lookup(key)(s.finalizers()),
                () => T.unit,
                (f) => f(exit)
              ),
              new Running(s.nextKey, remove(key)(s.finalizers()))
            ]
          }
        }
      })
    )
}
