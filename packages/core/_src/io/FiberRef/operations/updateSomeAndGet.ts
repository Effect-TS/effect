/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @tsplus fluent effect/core/io/FiberRef updateSomeAndGet
 */
export function updateSomeAndGet_<A, P>(
  self: FiberRef<A, P>,
  pf: (a: A) => Maybe<A>,
  __tsplusTrace?: string
): Effect<never, never, A> {
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
 * @tsplus static effect/core/io/FiberRef.Aspects updateSomeAndGet
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
