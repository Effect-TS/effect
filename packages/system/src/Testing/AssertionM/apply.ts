// ets_tracing: off

import type { Lazy } from "../../Function/index.js"
import type * as ARM from "../AssertionResultM/index.js"
import type * as R from "../Render/index.js"
import { AssertionM } from "./AssertionM.js"

export function apply<A>(
  render: () => R.Render,
  runM: (a: Lazy<A>) => ARM.AssertResultM
): AssertionM<A> {
  return new (class extends AssertionM<A> {})(render, runM)
}
