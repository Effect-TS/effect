import { Annotated, Both, Die, Then } from "@effect/core/io/Cause/definition"

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`, return only
 * `Die` cause/finalizer defects.
 *
 * @tsplus getter effect/core/io/Cause keepDefects
 */
export function keepDefects<E>(self: Cause<E>): Maybe<Cause<never>> {
  return self.fold<E, Maybe<Cause<never>>>(
    Maybe.none,
    () => Maybe.none,
    (e) => Maybe.some(new Die(e)),
    () => Maybe.none,
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Maybe.some(new Then(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Maybe.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Maybe.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return Maybe.none
      }
      throw new Error("Bug")
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Maybe.some(new Both(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Maybe.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Maybe.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return Maybe.none
      }
      throw new Error("Bug")
    },
    (causeMaybe, annotation) => causeMaybe.map((cause) => new Annotated(cause, annotation))
  )
}
