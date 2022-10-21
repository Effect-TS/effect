/**
 * @tsplus static effect/core/io/FiberRefs.Ops __call
 */
export function make(
  fiberRefLocals: ImmutableMap<
    FiberRef<unknown>,
    List.NonEmpty<readonly [FiberId.Runtime, unknown]>
  >
): FiberRefs {
  return new FiberRefs(fiberRefLocals)
}
