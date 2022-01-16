// ets_tracing: off

import { insert_ } from "../../Collections/Immutable/Map/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import * as T from "../operations/_internal/effect"
import * as Ref from "../operations/_internal/ref"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { next } from "./next"
import { Exited, Running } from "./state"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 */
export function addIfOpen_(
  self: ReleaseMap,
  finalizer: Finalizer,
  __trace?: string
): T.UIO<O.Option<number>> {
  return T.flatten(
    Ref.modify_(self.ref, (s) => {
      switch (s._tag) {
        case "Exited": {
          return Tp.tuple(
            T.map_(finalizer(s.exit), () => O.none),
            new Exited(next(s.nextKey), s.exit, s.update)
          )
        }
        case "Running": {
          return Tp.tuple(
            T.succeed(() => O.some(s.nextKey)),
            new Running(
              next(s.nextKey),
              insert_(s.finalizers(), s.nextKey, finalizer),
              s.update
            )
          )
        }
      }
    }),
    __trace
  )
}

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * scope is still open, a key will be returned. This is an identifier that can
 * be used to activate this finalizer and remove it from the map. If the scope
 * has been closed, the finalizer will be executed immediately (with the `Exit`
 * value with which the scope has ended) and no key will be returned.
 *
 * @ets_data_first addIfOpen_
 */
export function addIfOpen(finalizer: Finalizer, __trace?: string) {
  return (self: ReleaseMap): T.Effect<unknown, never, O.Option<number>> =>
    addIfOpen_(self, finalizer, __trace)
}
