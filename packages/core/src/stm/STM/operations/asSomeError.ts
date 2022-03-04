import { Option } from "../../../data/Option"
import type { STM } from "../definition"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus fluent ets/STM asSomeError
 */
export function asSomeError<R, E, A>(self: STM<R, E, A>): STM<R, Option<E>, A> {
  return self.mapError(Option.some)
}
