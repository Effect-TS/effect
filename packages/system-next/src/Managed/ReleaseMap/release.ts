// ets_tracing: off

import { lookup_, remove_ } from "../../Collections/Immutable/Map/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../operations/_internal/effect"
import type { Exit } from "../operations/_internal/exit"
import * as R from "../operations/_internal/ref"
import type { ReleaseMap } from "./definition"
import { Running } from "./state"

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 */
export function release_(
  self: ReleaseMap,
  key: number,
  exit: Exit<any, any>,
  __trace?: string
): T.UIO<any> {
  return T.flatten(
    pipe(
      self.ref,
      R.modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return Tp.tuple(T.unit, s)
          }
          case "Running": {
            return Tp.tuple(
              O.fold_(
                lookup_(s.finalizers(), key),
                () => T.unit,
                (fin) => s.update(fin)(exit)
              ),
              new Running(s.nextKey, remove_(s.finalizers(), key), s.update)
            )
          }
        }
      })
    ),
    __trace
  )
}

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @ets_data_first release_
 */
export function release(key: number, exit: Exit<any, any>, __trace?: string) {
  return (self: ReleaseMap) => release_(self, key, exit, __trace)
}
