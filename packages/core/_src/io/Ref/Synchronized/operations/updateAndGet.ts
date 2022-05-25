/**
 * Atomically modifies the `Ref.Synchronized` with the specified function and
 * returns the updated value.
 *
 * @tsplus fluent ets/Ref/Synchronized updateAndGet
 */
export function updateAndGet_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect.UIO<A> {
  return self.modify((v) => {
    const result = f(v)
    return Tuple(result, result)
  })
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function and
 * returns the updated value.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects updateAndGet
 */
export const updateAndGet = Pipeable(updateAndGet_)
