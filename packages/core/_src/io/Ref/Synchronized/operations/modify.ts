import { concreteSynchronizedRef } from "@effect-ts/core/io/Ref/Synchronized/operations/_internal/SynchronizedRefInternal";

/**
 * Atomically modifies the `Ref` with the specified function, which computes a
 * return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @tsplus fluent ets/Ref/Synchronized modify
 */
export function modify_<R, E, A, B>(
  self: SynchronizedRef<A>,
  f: (a: A) => Tuple<[B, A]>,
  __tsplusTrace?: string
): Effect<R, E, B> {
  concreteSynchronizedRef(self);
  return self.modifyEffect((a) => Effect.succeed(f(a)));
}

/**
 * Atomically modifies the `Ref` with the specified function, which computes a
 * return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects modify
 */
export const modify = Pipeable(modify_);
