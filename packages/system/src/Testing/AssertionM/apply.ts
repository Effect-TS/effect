import type { Lazy } from "../../Function"
import type * as ARM from "../AssertionResultM"
import type * as R from "../Render"
import { AssertionM } from "./AssertionM"

export function apply<A>(
  render: () => R.Render,
  runM: (a: Lazy<A>) => ARM.AssertResultM
): AssertionM<A> {
  return new (class extends AssertionM<A> {})(render, runM)
}
