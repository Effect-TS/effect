import type { Lazy } from "../../Function"
import * as O from "../../Option"
import type * as AM from "../AssertionM/AssertionM"
import type * as AR from "../AssertionResult"
import type { AssertionValue } from "./AssertionValue"

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
