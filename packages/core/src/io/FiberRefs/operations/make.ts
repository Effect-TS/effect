import type { List } from "@fp-ts/data/List"
/**
 * @tsplus static effect/core/io/FiberRefs.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make(
  fiberRefLocals: ReadonlyMap<
    FiberRef<unknown>,
    List.Cons<readonly [FiberId.Runtime, unknown]>
  >
): FiberRefs {
  return new FiberRefs(fiberRefLocals)
}
