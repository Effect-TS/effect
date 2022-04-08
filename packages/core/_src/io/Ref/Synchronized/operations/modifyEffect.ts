import { concreteSynchronizedRef } from "@effect/core/io/Ref/Synchronized/operations/_internal/SynchronizedRefInternal";

/**
 * Atomically modifies the `Ref.Synchronized` with the specified effectful
 * function, which computes a return value for the modification. This is a
 * more powerful version of `update`.
 *
 * @tsplus fluent ets/Ref/Synchronized modifyEffect
 */
export function modifyEffect_<R, E, A, B>(
  self: SynchronizedRef<A>,
  f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect<R, E, B> {
  concreteSynchronizedRef(self);
  return self.semaphore.withPermit(
    self
      .get()
      .flatMap(f)
      .flatMap(({ tuple: [b, a] }) => self.ref.set(a).as(b))
  );
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified effectful
 * function, which computes a return value for the modification. This is a
 * more powerful version of `update`.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects modifyEffect
 */
export const modifyEffect = Pipeable(modifyEffect_);
