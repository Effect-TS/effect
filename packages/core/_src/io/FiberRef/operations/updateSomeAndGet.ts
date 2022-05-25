/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @tsplus fluent ets/FiberRef updateSomeAndGet
 */
export function updateSomeAndGet_<A, P>(
  self: FiberRef<A, P>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect.UIO<A> {
  return self.modify((v) => {
    const result = pf(v).getOrElse(v)
    return Tuple(result, result)
  })
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @tsplus static ets/FiberRef/Aspects updateSomeAndGet
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
