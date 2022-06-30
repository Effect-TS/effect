import { CompositeFiberId, realFiberId } from "@effect/core/io/FiberId/definition"

/**
 * Combine two `FiberId`s.
 *
 * @tsplus pipeable-operator effect/core/io/FiberId +
 * @tsplus static effect/core/io/FiberId.Aspects combine
 * @tsplus pipeable effect/core/io/FiberId combine
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
            return new CompositeFiberId(HashSet.from([self, that]))
          }
          case "Composite": {
            return new CompositeFiberId(that.fiberIds.add(self))
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
            return new CompositeFiberId(self.fiberIds.add(that))
          }
          case "Composite": {
            return new CompositeFiberId(self.fiberIds.union(that.fiberIds))
          }
        }
      }
    }
  }
}
