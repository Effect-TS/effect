/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or the `initial` value of the `FiberRef` otherwise.
 *
 * @tsplus static effect/core/io/FiberRefs.Aspects getOrDefault
 * @tsplus pipeable effect/core/io/FiberRefs getOrDefault
 */
export function getOrDefault<A>(fiberRef: FiberRef<A>) {
  return (self: FiberRefs): A => self.get(fiberRef).getOrElse(fiberRef.initial)
}
