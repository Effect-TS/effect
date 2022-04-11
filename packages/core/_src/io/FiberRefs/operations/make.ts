import { FiberRefsInternal } from "@effect/core/io/FiberRefs/operations/_internal/FiberRefsInternal";

/**
 * @tsplus static ets/FiberRefs/Ops __call
 */
export function make(
  fiberRefLocals: HashMap<
    FiberRef<unknown>,
    List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>
  >
): FiberRefs {
  return new FiberRefsInternal(fiberRefLocals);
}
