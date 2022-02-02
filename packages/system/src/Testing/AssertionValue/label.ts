import * as AM from "../AssertionM/api"
import type { AssertionValue } from "./AssertionValue"
import { makeAssertionValue } from "./makeAssertionValue"

export function label_(self: AssertionValue, l: string): AssertionValue {
  return makeAssertionValue(
    AM.label_(self.assertion, l),
    self.value,
    self.result,
    self.expression,
    self.sourceLocation
  )
}

export function label(l: string) {
  return (self: AssertionValue) => label_(self, l)
}
