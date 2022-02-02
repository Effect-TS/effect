import type { Cause } from "../../Cause"
import type { Exit } from "../definition"

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
 * @ets_data_first getOrElse_
 */
export function getOrElse<E, A>(orElse: (cause: Cause<E>) => A) {
  return (self: Exit<E, A>): A => self.getOrElse(orElse)
}
