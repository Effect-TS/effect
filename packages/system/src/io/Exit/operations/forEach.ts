import { Effect } from "../../Effect"
import { Exit } from "../definition"

/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @tsplus fluent ets/Exit forEach
 */
export function forEach_<E, A, R, E1, B>(
  self: Exit<E, A>,
  f: (a: A) => Effect<R, E1, B>,
  __etsTrace?: string
): Effect<R, never, Exit<E | E1, B>> {
  switch (self._tag) {
    case "Failure":
      return Effect.succeed(Exit.failCause(self.cause))
    case "Success":
      return f(self.value).exit()
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E1, B>(
  f: (a: A) => Effect<R, E1, B>,
  __etsTrace?: string
) {
  return <E>(self: Exit<E, A>): Effect<R, never, Exit<E | E1, B>> => self.forEach(f)
}
