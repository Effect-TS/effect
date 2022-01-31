import { Effect } from "../definition"

// TODO(Mike/Max): revise => should look like io.onRight<X>()

/**
 * Returns this effect if environment is on the right, otherwise returns
 * whatever is on the left unmodified. Note that the result is lifted
 * in either.
 */
export function onRight<C>(__etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => Effect.environment<C>().joinEither(self)
}
