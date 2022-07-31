import { IFiberRefModifyAll } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @tsplus static effect/core/io/Effect.Ops getFiberRefs
 */
export function getFiberRefs(): Effect<never, never, FiberRefs> {
  return new IFiberRefModifyAll(
    (_, fiberRefs) => Tuple(fiberRefs, fiberRefs)
  )
}
