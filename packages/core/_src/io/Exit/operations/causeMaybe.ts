/**
 * Returns an option of the cause of failure.
 *
 * @tsplus getter ets/Exit causeMaybe
 */
export function causeMaybe<E, A>(self: Exit<E, A>): Maybe<Cause<E>> {
  switch (self._tag) {
    case "Failure":
      return Maybe.some(self.cause)
    case "Success":
      return Maybe.none
  }
}
