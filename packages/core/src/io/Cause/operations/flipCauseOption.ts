import { Option } from "../../../data/Option"
import type { Cause } from "../definition"
import { Both, Die, Empty, Fail, Interrupt, Stackless, Then } from "../definition"

/**
 * Converts the specified `Cause[Option[E]]` to an `Option[Cause[E]]` by
 * recursively stripping out any failures with the error `None`.
 *
 * @tsplus static ets/CauseOps flipCauseOption
 */
export function flipCauseOption<E>(cause: Cause<Option<E>>): Option<Cause<E>> {
  return cause.fold<Option<E>, Option<Cause<E>>>(
    Option.some(new Empty()),
    (failureOption, trace) => failureOption.map((e) => new Fail(e, trace)),
    (defect, trace) => Option.some(new Die(defect, trace)),
    (fiberId, trace) => Option.some(new Interrupt(fiberId, trace)),
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Then(left.value, right.value))
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value)
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value)
      }
      return Option.none
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Both(left.value, right.value))
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value)
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value)
      }
      return Option.none
    },
    (causeOption, stackless) =>
      causeOption.map((cause) => new Stackless(cause, stackless))
  )
}
