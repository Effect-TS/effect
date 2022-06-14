/**
 * Returns an option of the cause of failure.
 *
 * @tsplus getter ets/Exit causeOption
 */
export function causeOption<E, A>(self: Exit<E, A>): Option<Cause<E>> {
  switch (self._tag) {
    case "Failure":
      return Option.some(self.cause)
    case "Success":
      return Option.none
  }
}
