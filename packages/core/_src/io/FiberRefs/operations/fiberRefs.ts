import { concreteFiberRefs } from "@effect/core/io/FiberRefs/operations/_internal/FiberRefsInternal"

/**
 * Returns a set of each `FiberRef` in this collection.
 *
 * @tsplus getter effect/core/io/FiberRefs fiberRefs
 */
export function fiberRefs(self: FiberRefs): HashSet<FiberRef<unknown, unknown>> {
  concreteFiberRefs(self)
  return HashSet.from(self.fiberRefLocals.internalMap.keys())
}
