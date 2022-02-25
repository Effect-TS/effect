import {
  insert as mapInsert,
  lookup as mapLookup
} from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { modify_ as refModify_ } from "../../Ref/operations/modify"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { Exited, Running } from "./state"

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * @tsplus fluent ets/ReleaseMap replace
 */
export function replace_(
  self: ReleaseMap,
  key: number,
  finalizer: Finalizer,
  __tsplusTrace?: string
): UIO<Option<Finalizer>> {
  return refModify_(self.ref, (s) => {
    switch (s._tag) {
      case "Exited":
        return Tuple(
          finalizer(s.exit).map(() => Option.none),
          new Exited(s.nextKey, s.exit, s.update)
        )
      case "Running":
        return Tuple(
          Effect.succeed(mapLookup(key)(s.finalizers())),
          new Running(s.nextKey, mapInsert(key, finalizer)(s.finalizers()), s.update)
        )
    }
  }).flatten()
}

/**
 * Replaces the finalizer associated with this key and returns it. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * @ets_data_first replace_
 */
export function replace(key: number, finalizer: Finalizer, __tsplusTrace?: string) {
  return (self: ReleaseMap): Effect<unknown, never, Option<Finalizer>> =>
    replace_(self, key, finalizer)
}
