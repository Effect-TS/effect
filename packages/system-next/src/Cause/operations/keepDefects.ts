import * as O from "../../Option/core"
import type { Cause } from "../definition"
import { Both, Die, Stackless, Then } from "../definition"
import { fold_ } from "./fold"

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`, return only
 * `Die` cause/finalizer defects.
 */
export function keepDefects<E>(self: Cause<E>): O.Option<Cause<never>> {
  return fold_<E, O.Option<Cause<never>>>(
    self,
    () => O.none,
    () => O.none,
    (e, trace) => O.some(new Die(e, trace)),
    () => O.none,
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(new Then(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return O.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return O.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return O.none
      }
      throw new Error("Bug")
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(new Both(left.value, right.value))
      }
      if (left._tag === "Some" && right._tag === "None") {
        return O.some(left.value)
      }
      if (left._tag === "None" && right._tag === "Some") {
        return O.some(right.value)
      }
      if (left._tag === "None" && right._tag === "None") {
        return O.none
      }
      throw new Error("Bug")
    },
    (causeOption, stackless) =>
      O.map_(causeOption, (cause) => new Stackless(cause, stackless))
  )
}
