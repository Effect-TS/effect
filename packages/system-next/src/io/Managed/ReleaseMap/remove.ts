import {
  lookup_ as mapLookup_,
  remove_ as mapRemove_
} from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import { modify_ as refModify_ } from "../../Ref/operations/modify"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { Exited, Running } from "./state"

/**
 * Removes the finalizer associated with this key and returns it.
 *
 * @ets fluent ets/ReleaseMap remove
 */
export function remove_(
  self: ReleaseMap,
  key: number,
  __etsTrace?: string
): UIO<Option<Finalizer>> {
  return refModify_(self.ref, (s) => {
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
 *
 * @ets_data_first remove_
 */
export function remove(key: number, __etsTrace?: string) {
  return (self: ReleaseMap): UIO<Option<Finalizer>> => remove_(self, key)
}
