import type { Exit } from "../definition"

/**
 * Flat maps over the value type.
 */
export function chain_<E, A, E1, A1>(
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
 * @ets_data_first chain_
 */
export function chain<A, E1, A1>(f: (a: A) => Exit<E1, A1>) {
  return <E>(self: Exit<E, A>): Exit<E | E1, A1> => chain_(self, f)
}
