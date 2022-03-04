import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus fluent ets/STM someOrFail
 */
export function someOrFail_<R, E, A, E2>(
  self: STM<R, E, Option<A>>,
  orFail: LazyArg<E2>
): STM<R, E | E2, A> {
  return self.flatMap((option) =>
    option.fold(STM.succeed(orFail).flatMap(STM.failNow), STM.succeedNow)
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E2>(orFail: LazyArg<E2>) {
  return <R, E, A>(self: STM<R, E, Option<A>>): STM<R, E | E2, A> =>
    self.someOrFail(orFail)
}
