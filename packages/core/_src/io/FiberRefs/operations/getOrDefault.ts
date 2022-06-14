/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or the `initial` value of the `FiberRef` otherwise.
 *
 * @tsplus fluent ets/FiberRefs getOrDefault
 */
export function getOrDefault_<A, P>(self: FiberRefs, fiberRef: FiberRef<A, P>): A {
  return self.get(fiberRef).getOrElse(fiberRef.initial)
}

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or the `initial` value of the `FiberRef` otherwise.
 *
 * @tsplus static ets/FiberRefs/Aspects getOrDefault
 */
export const getOrDefault = Pipeable(getOrDefault_)
