import { CompositeFiberId, realFiberId } from "@effect/core/io/FiberId/definition"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Combine two `FiberId`s.
 *
 * @tsplus pipeable-operator effect/core/io/FiberId +
 * @tsplus static effect/core/io/FiberId.Aspects combine
 * @tsplus pipeable effect/core/io/FiberId combine
 * @category mutations
 * @since 1.0.0
 */
export function combine(that: FiberId) {
  return (self: FiberId): FiberId => {
    realFiberId(self)
    switch (self._tag) {
      case "None": {
        return that
      }
      case "Runtime": {
        realFiberId(that)
        switch (that._tag) {
          case "None": {
            return self
          }
          case "Runtime": {
            return new CompositeFiberId(HashSet.make(self, that))
          }
          case "Composite": {
            return new CompositeFiberId(pipe(that.fiberIds, HashSet.add(self)))
          }
        }
      }
      case "Composite": {
        realFiberId(that)
        switch (that._tag) {
          case "None": {
            return self
          }
          case "Runtime": {
            return new CompositeFiberId(pipe(self.fiberIds, HashSet.add(that)))
          }
          case "Composite": {
            return new CompositeFiberId(pipe(self.fiberIds, HashSet.union(that.fiberIds)))
          }
        }
      }
    }
  }
}
