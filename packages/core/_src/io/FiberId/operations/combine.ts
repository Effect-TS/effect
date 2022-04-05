import { CompositeFiberId, realFiberId } from "@effect-ts/core/io/FiberId/definition";

/**
 * Combine two `FiberId`s.
 *
 * @tsplus operator ets/FiberId +
 * @tsplus fluent ets/FiberId combine
 */
export function combine_(self: FiberId, that: FiberId): FiberId {
  realFiberId(self);
  switch (self._tag) {
    case "None": {
      return that;
    }
    case "Runtime": {
      realFiberId(that);
      switch (that._tag) {
        case "None": {
          return self;
        }
        case "Runtime": {
          return new CompositeFiberId(HashSet.from([self, that]));
        }
        case "Composite": {
          return new CompositeFiberId(that.fiberIds.add(self));
        }
      }
    }
    case "Composite": {
      realFiberId(that);
      switch (that._tag) {
        case "None": {
          return self;
        }
        case "Runtime": {
          return new CompositeFiberId(self.fiberIds.add(that));
        }
        case "Composite": {
          return new CompositeFiberId(self.fiberIds.union(that.fiberIds));
        }
      }
    }
  }
}

/**
 * Combine two `FiberId`s.
 *
 * @tsplus static ets/FiberId/Aspects combine
 */
export const combine = Pipeable(combine_);
