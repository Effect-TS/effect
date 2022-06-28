import { concreteFiberRefs } from "@effect/core/io/FiberRefs/operations/_internal/FiberRefsInternal"

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or `None` otherwise.
 *
 * @tsplus static effect/core/io/FiberRefs.Aspects get
 * @tsplus pipeable effect/core/io/FiberRefs get
 */
export function get<A, P>(fiberRef: FiberRef<A, P>) {
  return (self: FiberRefs): Maybe<A> => {
    concreteFiberRefs(self)
    return self.fiberRefLocals.get(fiberRef).map((list) => list.head.get(1) as A)
  }
}
