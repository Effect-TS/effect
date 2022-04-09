/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @tsplus fluent ets/FiberId getOrElse
 */
export function getOrElse_(self: FiberId, that: LazyArg<FiberId>): FiberId {
  return self.isNone() ? that() : self;
}

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @tsplus static ets/FiberId/Aspects getOrElse
 */
export const getOrElse = Pipeable(getOrElse_);
