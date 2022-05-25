/**
 * Effectually flat maps over the value type.
 *
 * @tsplus fluent ets/Exit flatMapEffect
 */
export function flatMapEffect_<E, A, R, E1, A1>(
  self: Exit<E, A>,
  f: (a: A) => Effect<R, E1, Exit<E, A1>>,
  __tsplusTrace?: string
): Effect<R, E1, Exit<E, A1>> {
  switch (self._tag) {
    case "Failure":
      return Effect.succeed(self)
    case "Success":
      return f(self.value)
  }
}

/**
 * Effectually flat maps over the value type.
 *
 * @tsplus static ets/Exit/Aspects flatMapEffect
 */
export const flatMapEffect = Pipeable(flatMapEffect_)
