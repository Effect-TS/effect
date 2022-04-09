import { concreteRef } from "@effect/core/io/Ref/operations/_internal/RefInternal";

/**
 * Atomically modifies the `Ref` with the specified function, which computes a
 * return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @tsplus fluent ets/Ref modify
 */
export function modify_<A, B>(
  self: Ref<A>,
  f: (a: A) => Tuple<[B, A]>,
  __tsplusTrace?: string
): UIO<B> {
  concreteRef(self);
  return Effect.succeed(() => {
    const v = self.value.get;
    const o = f(v);
    self.value.set(o.get(1));
    return o.get(0);
  });
}

/**
 * Atomically modifies the `Ref` with the specified function, which computes a
 * return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @tsplus static ets/Ref/Aspects modify
 */
export const modify = Pipeable(modify_);
