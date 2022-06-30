import { Both, Die, Empty, Fail, Interrupt, Stackless, Then } from "@effect/core/io/Cause/definition"

/**
 * Converts the specified `Cause<Maybe<E>>` to an `Maybe[Cause[E]]` by
 * recursively stripping out any failures with the error `None`.
 *
 * @tsplus static effect/core/io/Cause.Ops flipCauseMaybe
 */
export function flipCauseMaybe<E>(cause: Cause<Maybe<E>>): Maybe<Cause<E>> {
  return cause.fold<Maybe<E>, Maybe<Cause<E>>>(
    Maybe.some(new Empty()),
    (failureMaybe, trace) => failureMaybe.map((e) => new Fail(e, trace)),
    (defect, trace) => Maybe.some(new Die(defect, trace)),
    (fiberId, trace) => Maybe.some(new Interrupt(fiberId, trace)),
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Maybe.some(new Then(left.value, right.value))
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Maybe.some(right.value)
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Maybe.some(left.value)
      }
      return Maybe.none
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Maybe.some(new Both(left.value, right.value))
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Maybe.some(right.value)
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Maybe.some(left.value)
      }
      return Maybe.none
    },
    (causeMaybe, stackless) => causeMaybe.map((cause) => new Stackless(cause, stackless))
  )
}
