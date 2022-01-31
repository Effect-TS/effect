import { insert_ as mapInsert_ } from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { modify_ as refModify_ } from "../../Ref/operations/modify"
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
 *
 * @ets fluent ets/ReleaseMap addIfOpen
 */
export function addIfOpen_(
  self: ReleaseMap,
  finalizer: Finalizer,
  __etsTrace?: string
): UIO<Option<number>> {
  return refModify_(self.ref, (s) => {
    switch (s._tag) {
      case "Exited": {
        return Tuple(
          finalizer(s.exit).map(() => Option.none),
          new Exited(next(s.nextKey), s.exit, s.update)
        )
      }
      case "Running": {
        return Tuple(
          Effect.succeed(() => Option.some(s.nextKey)),
          new Running(
            next(s.nextKey),
            mapInsert_(s.finalizers(), s.nextKey, finalizer),
            s.update
          )
        )
      }
    }
  }).flatten()
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
export function addIfOpen(finalizer: Finalizer, __etsTrace?: string) {
  return (self: ReleaseMap): Effect<unknown, never, Option<number>> =>
    addIfOpen_(self, finalizer)
}
