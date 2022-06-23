/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 *
 * @tsplus fluent ets/Ref/Synchronized updateEffect
 */
export function updateEffect_<R, E, A>(
  self: Ref.Synchronized<A>,
  f: (a: A) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(undefined, result)))
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects updateEffect
 */
export const updateEffect = Pipeable(updateEffect_)
