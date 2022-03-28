import {
  lookup_ as mapLookup_,
  remove_ as mapRemove_
} from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
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
  return self.ref
    .modify((s) => {
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
    })
    .flatten()
}

/**
 * Runs the specified finalizer and removes it from the finalizers associated
 * with this scope.
 */
export const release = Pipeable(release_)
