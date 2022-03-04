import { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 *
 * @tsplus getter ets/STM get
 */
export function get<R, E, A>(self: STM<R, E, Option<A>>): STM<R, Option<E>, A> {
  return self.foldSTM(
    (x) => STM.fail(Option.some(x)),
    (_) => _.fold(() => STM.fail(Option.none), STM.succeedNow)
  )
}
