import * as HS from "../../Collections/Immutable/HashSet"
import type { FiberId } from "../definition"
import { Composite } from "../definition"

/**
 * Combine two `FiberId`s.
 */
export function combine_(self: FiberId, that: FiberId): FiberId {
  switch (self._tag) {
    case "None": {
      return that
    }
    case "Runtime": {
      switch (that._tag) {
        case "None": {
          return self
        }
        case "Runtime": {
          return new Composite(
            HS.mutate_(HS.make(), (ids) => {
              HS.add_(ids, self)
              HS.add_(ids, that)
            })
          )
        }
        case "Composite": {
          return new Composite(HS.add_(that.fiberIds, self))
        }
      }
    }
    case "Composite": {
      switch (that._tag) {
        case "None": {
          return self
        }
        case "Runtime": {
          return new Composite(HS.add_(self.fiberIds, that))
        }
        case "Composite": {
          return new Composite(HS.union_(self.fiberIds, that.fiberIds))
        }
      }
    }
  }
}

/**
 * Combine two `FiberId`s.
 *
 * @ets_data_first combine_
 */
export function combine(that: FiberId) {
  return (self: FiberId): FiberId => combine_(self, that)
}
