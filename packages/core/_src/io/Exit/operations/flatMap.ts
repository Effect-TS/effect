/**
 * Flat maps over the value type.
 *
 * @tsplus fluent ets/Exit flatMap
 */
export function flatMap_<E, A, E1, A1>(
  self: Exit<E, A>,
  f: (a: A) => Exit<E1, A1>
): Exit<E | E1, A1> {
  switch (self._tag) {
    case "Failure":
      return self
    case "Success":
      return f(self.value)
  }
}

/**
 * Flat maps over the value type.
 *
 * @tsplus static ets/Exit/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_)
