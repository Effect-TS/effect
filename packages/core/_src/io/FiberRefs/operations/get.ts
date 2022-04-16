import { concreteFiberRefs } from "@effect/core/io/FiberRefs/operations/_internal/FiberRefsInternal";

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or `None` otherwise.
 *
 * @tsplus fluent ets/FiberRefs get
 */
export function get_<A, P>(self: FiberRefs, fiberRef: FiberRef<A, P>): Option<A> {
  concreteFiberRefs(self);
  return self.fiberRefLocals.get(fiberRef).map((list) => list.head.get(1) as A);
}

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or `None` otherwise.
 *
 * @tsplus static ets/FiberRefs/Aspects get
 */
export const get = Pipeable(get_);
