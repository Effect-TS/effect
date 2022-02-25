import {
  lookup_ as mapLookup_,
  remove_ as mapRemove_
} from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import { modify_ as refModify_ } from "../../Ref/operations/modify"
import type { ReleaseMap } from "./definition"
import { Running } from "./state"

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @tsplus fluent ets/ReleaseMap release
 */
export function release_(
  self: ReleaseMap,
  key: number,
  exit: Exit<any, any>,
  __tsplusTrace?: string
): UIO<any> {
  return refModify_(self.ref, (s) => {
    switch (s._tag) {
      case "Exited": {
        return Tuple(Effect.unit, s)
      }
      case "Running": {
        return Tuple(
          mapLookup_(s.finalizers(), key).fold(
            () => Effect.unit,
            (fin) => s.update(fin)(exit)
          ),
          new Running(s.nextKey, mapRemove_(s.finalizers(), key), s.update)
        )
      }
    }
  }).flatten()
}

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 *
 * @ets_data_first release_
 */
export function release(key: number, exit: Exit<any, any>, __tsplusTrace?: string) {
  return (self: ReleaseMap) => self.release(key, exit)
}
