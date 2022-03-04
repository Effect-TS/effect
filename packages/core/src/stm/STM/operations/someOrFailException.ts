import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Option } from "../../../data/Option"
import type { STM } from "../definition"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 *
 * @tsplus fluent ets/STM someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: STM<R, E, Option<A>>
): STM<R, E | NoSuchElementException, A> {
  return self.someOrFail(new NoSuchElementException())
}
