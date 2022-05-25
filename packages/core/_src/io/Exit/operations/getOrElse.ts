/**
 * Retrieves the `A` if succeeded, or else returns the specified default `A`.
 *
 * @tsplus fluent ets/Exit getOrElse
 */
export function getOrElse_<E, A>(self: Exit<E, A>, orElse: (cause: Cause<E>) => A): A {
  switch (self._tag) {
    case "Failure":
      return orElse(self.cause)
    case "Success":
      return self.value
  }
}

/**
 * Retrieves the `A` if succeeded, or else returns the specified default `A`.
 *
 * @tsplus static ets/Exit/Aspects getOrElse
 */
export const getOrElse = Pipeable(getOrElse_)
