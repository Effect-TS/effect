/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSomeAndGet
 */
export function updateSomeAndGet_<A>(
  self: SynchronizedRef<A>,
  pf: (a: A) => Maybe<A>,
  __tsplusTrace?: string
): Effect<never, never, A> {
  return self.modify((v) => {
    const result = pf(v).getOrElse(v)
    return Tuple(result, result)
  })
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects updateSomeAndGet
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
