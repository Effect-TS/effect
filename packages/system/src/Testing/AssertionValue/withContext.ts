import type * as O from "../../Option"
import type { AssertionValue } from "./AssertionValue"
import { makeAssertionValue } from "./makeAssertionValue"

export function withContext_(
  self: AssertionValue,
  expr: O.Option<string>,
  sourceLocation: O.Option<string>
): AssertionValue {
  return makeAssertionValue(
    self.assertion,
    self.value,
    self.result,
    expr,
    sourceLocation
  )
}

export function withContext(expr: O.Option<string>, sourceLocation: O.Option<string>) {
  return (self: AssertionValue) => withContext_(self, expr, sourceLocation)
}
