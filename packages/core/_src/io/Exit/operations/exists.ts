/**
 * @tsplus fluent ets/Exit exists
 */
export function exists_<E, A>(self: Exit<E, A>, f: Predicate<A>): boolean {
  switch (self._tag) {
    case "Failure":
      return false
    case "Success":
      return f(self.value)
  }
}

/**
 * @tsplus static ets/Exit/Aspects exists
 */
export const exists = Pipeable(exists_)
