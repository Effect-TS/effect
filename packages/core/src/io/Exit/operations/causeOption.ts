import * as Option from "@fp-ts/data/Option"

/**
 * Returns an option of the cause of failure.
 *
 * @tsplus getter effect/core/io/Exit causeOption
 * @category destructors
 * @since 1.0.0
 */
export function causeOption<E, A>(self: Exit<E, A>): Option.Option<Cause<E>> {
  switch (self._tag) {
    case "Failure":
      return Option.some(self.cause)
    case "Success":
      return Option.none
  }
}
