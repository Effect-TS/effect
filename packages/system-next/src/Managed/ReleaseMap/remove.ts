// ets_tracing: off

import { lookup_, remove_ as mapRemove_ } from "../../Collections/Immutable/Map"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type * as T from "../operations/_internal/effect"
import * as Ref from "../operations/_internal/ref"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { Exited, Running } from "./state"

/**
 * Removes the finalizer associated with this key and returns it.
 */
export function remove_(
  self: ReleaseMap,
  key: number,
  __trace?: string
): T.UIO<O.Option<Finalizer>> {
  return pipe(
    self.ref,
    Ref.modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return Tp.tuple(O.none, new Exited(s.nextKey, s.exit, s.update))
        }
        case "Running": {
          return Tp.tuple(
            lookup_(s.finalizers(), key),
            new Running(s.nextKey, mapRemove_(s.finalizers(), key), s.update)
          )
        }
      }
    }, __trace)
  )
}

/**
 * Removes the finalizer associated with this key and returns it.
 *
 * @ets_data_first remove_
 */
export function remove(key: number, __trace?: string) {
  return (self: ReleaseMap): T.UIO<O.Option<Finalizer>> => remove_(self, key, __trace)
}
