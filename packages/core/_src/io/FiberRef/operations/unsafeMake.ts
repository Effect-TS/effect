import { FiberRefInternal } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * @tsplus static ets/FiberRef/Ops unsafeMake
 */
export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): FiberRef<A> {
  return new FiberRefInternal(initial, fork, join);
}
