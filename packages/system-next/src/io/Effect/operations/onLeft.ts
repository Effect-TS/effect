import { Effect } from "../definition"

// TODO(Mike/Max): revise => should look like io.onLeft<X>()

/**
 * Returns this effect if environment is on the left, otherwise returns
 * whatever is on the right unmodified. Note that the result is lifted
 * in either.
 */
export function onLeft<C>(__etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => self.joinEither(Effect.environment<C>())
}
