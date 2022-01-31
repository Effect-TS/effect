// ets_tracing: off

import type { Lazy } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import type * as AM from "../AssertionM/AssertionM.js"
import type * as AR from "../AssertionResult/index.js"
import type { AssertionValue } from "./AssertionValue.js"

export function makeAssertionValue<A>(
  assertion: AM.AssertionM<A>,
  value: Lazy<A>,
  result: Lazy<AR.AssertResult>,
  expression: O.Option<string> = O.none,
  sourceLocation: O.Option<string> = O.none
): AssertionValue {
  return {
    value,
    expression,
    sourceLocation,
    assertion,
    result
  }
}
