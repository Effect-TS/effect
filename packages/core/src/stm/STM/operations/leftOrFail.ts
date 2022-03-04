import type { Either } from "../../../data/Either"
import { STM } from "../definition"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @tsplus fluent ets/STM leftOrFail
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: STM<R, E, Either<B, C>>,
  orFail: (c: C) => E1
): STM<R, E | E1, B> {
  return self.flatMap((_) => _.fold(STM.succeedNow, (x) => STM.fail(orFail(x))))
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @ets_data_first leftOrFail_
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: STM<R, E, Either<B, C>>): STM<R, E | E1, B> =>
    self.leftOrFail(orFail)
}
