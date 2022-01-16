// ets_tracing: off

import { insert, lookup } from "../../Collections/Immutable/Map/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import * as T from "../operations/_internal/effect"
import * as R from "../operations/_internal/ref"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { Exited, Running } from "./state"

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 */
export function replace_(
  self: ReleaseMap,
  key: number,
  finalizer: Finalizer,
  __trace?: string
): T.UIO<O.Option<Finalizer>> {
  return T.flatten(
    R.modify_(self.ref, (s) => {
      switch (s._tag) {
        case "Exited":
          return Tp.tuple(
            T.map_(finalizer(s.exit), () => O.none),
            new Exited(s.nextKey, s.exit, s.update)
          )
        case "Running":
          return Tp.tuple(
            T.succeed(() => lookup(key)(s.finalizers())),
            new Running(s.nextKey, insert(key, finalizer)(s.finalizers()), s.update)
          )
      }
    }),
    __trace
  )
}

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * @ets_data_first replace_
 */
export function replace(key: number, finalizer: Finalizer, __trace?: string) {
  return (self: ReleaseMap): T.Effect<unknown, never, O.Option<Finalizer>> =>
    replace_(self, key, finalizer, __trace)
}
