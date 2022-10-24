import { Both, Die, Stackless, Then } from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`, return only
 * `Die` cause/finalizer defects.
 *
 * @tsplus getter effect/core/io/Cause keepDefects
 * @category mutations
 * @since 1.0.0
 */
export function keepDefects<E>(self: Cause<E>): Option.Option<Cause<never>> {
  return self.fold<E, Option.Option<Cause<never>>>(
    Option.none,
    () => Option.none,
    (e) => Option.some(new Die(e)),
    () => Option.none,
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Then(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return Option.none
      }
      throw new Error("Bug")
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Both(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return Option.none
      }
      throw new Error("Bug")
    },
    (causeOption, stackless) =>
      pipe(
        causeOption,
        Option.map((cause) => new Stackless(cause, stackless))
      )
  )
}
