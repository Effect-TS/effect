/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @tsplus static effect/core/io/FiberId.Aspects getOrElse
 * @tsplus pipeable effect/core/io/FiberId getOrElse
 * @category mutations
 * @since 1.0.0
 */
export function getOrElse(that: LazyArg<FiberId>) {
  return (self: FiberId): FiberId => self.isNone() ? that() : self
}
