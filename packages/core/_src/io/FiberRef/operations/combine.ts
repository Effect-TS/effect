import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * Combines two patches to produce a new patch that describes the updates of
 * the first patch and then the updates of the second patch. The combine
 * operation should be associative. In addition, if the combine operation is
 * commutative then joining multiple fibers concurrently will result in
 * deterministic `FiberRef` values.
 *
 * @tsplus fluent ets/FiberRef combine
 */
export function combine_<Value, Patch>(self: FiberRef<Value, Patch>, first: Patch, second: Patch): Patch {
  concreteFiberRef(self)
  return self._combine(first, second) as Patch
}

/**
 * Combines two patches to produce a new patch that describes the updates of
 * the first patch and then the updates of the second patch. The combine
 * operation should be associative. In addition, if the combine operation is
 * commutative then joining multiple fibers concurrently will result in
 * deterministic `FiberRef` values.
 *
 * @tsplus static ets/FiberRef/Aspects combine
 */
export const combine = Pipeable(combine_)
