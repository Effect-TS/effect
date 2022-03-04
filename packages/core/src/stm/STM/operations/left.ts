import type { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error
 * `None`.
 *
 * @tsplus getter ets/STM left
 */
export function left<R, E, B, C>(self: STM<R, E, Either<B, C>>): STM<R, Option<E>, B> {
  return self.foldSTM(
    (e) => STM.fail(Option.some(e)),
    (_) => _.fold(STM.succeedNow, () => STM.fail(Option.none))
  )
}
