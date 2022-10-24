import {
  Both,
  Die,
  Empty,
  Fail,
  Interrupt,
  Stackless,
  Then
} from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Converts the specified `Cause<Maybe<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 *
 * @tsplus static effect/core/io/Cause.Ops flipCauseOption
 * @category mutations
 * @since 1.0.0
 */
export function flipCauseOption<E>(cause: Cause<Option.Option<E>>): Option.Option<Cause<E>> {
  return cause.fold<Option.Option<E>, Option.Option<Cause<E>>>(
    Option.some(new Empty()),
    (failureMaybe) => pipe(failureMaybe, Option.map((e) => new Fail(e))),
    (defect) => Option.some(new Die(defect)),
    (fiberId) => Option.some(new Interrupt(fiberId)),
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
    (causeMaybe, stackless) =>
      pipe(
        causeMaybe,
        Option.map((cause) => new Stackless(cause, stackless))
      )
  )
}
