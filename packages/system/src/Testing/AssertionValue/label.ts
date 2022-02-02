// ets_tracing: off

import * as AM from "../AssertionM/api.js"
import type { AssertionValue } from "./AssertionValue.js"
import { makeAssertionValue } from "./makeAssertionValue.js"

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
