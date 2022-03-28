import {
  lookup_ as mapLookup_,
  remove_ as mapRemove_
} from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { Finalizer } from "../definition"
import type { ReleaseMap } from "./definition"
import { Exited, Running } from "./state"

/**
 * Removes the finalizer associated with this key and returns it.
 *
 * @tsplus fluent ets/ReleaseMap remove
 */
export function remove_(
  self: ReleaseMap,
  key: number,
  __tsplusTrace?: string
): UIO<Option<Finalizer>> {
  return self.ref.modify((s) => {
    switch (s._tag) {
      case "Exited": {
        return Tuple(Option.none, new Exited(s.nextKey, s.exit, s.update))
      }
      case "Running": {
        return Tuple(
          mapLookup_(s.finalizers(), key),
          new Running(s.nextKey, mapRemove_(s.finalizers(), key), s.update)
        )
      }
    }
  })
}

/**
 * Removes the finalizer associated with this key and returns it.
 */
export const remove = Pipeable(remove_)
