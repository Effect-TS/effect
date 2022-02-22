import type { LazyArg } from "../../../data/Function"
import type { FiberId } from "../definition"

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @tsplus fluent ets/FiberId getOrElse
 */
export function getOrElse_(self: FiberId, that: LazyArg<FiberId>): FiberId {
  return self.isNone() ? that() : self
}

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @ets_data_first getOrElse_
 */
export function getOrElse(that: LazyArg<FiberId>) {
  return (self: FiberId): FiberId => self.getOrElse(that)
}
