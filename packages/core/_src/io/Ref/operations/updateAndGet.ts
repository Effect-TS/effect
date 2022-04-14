/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 *
 * @tsplus fluent ets/Ref updateAndGet
 */
export function updateAndGet_<A>(
  self: Ref<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect.UIO<A> {
  return self.modify((v) => {
    const result = f(v);
    return Tuple(result, result);
  });
}

/**
 * Atomically modifies the `Ref` with the specified function and returns
 * the updated value.
 *
 * @tsplus static ets/Ref/Aspects updateAndGet
 */
export const updateAndGet = Pipeable(updateAndGet_);
