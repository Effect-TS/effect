import * as AM from "../AssertionM/api"
import * as AR from "../AssertionResult"
import type { AssertionValue } from "./AssertionValue"
import { makeAssertionValue } from "./makeAssertionValue"

export function negate(self: AssertionValue): AssertionValue {
  return makeAssertionValue(
    AM.not(self.assertion),
    self.value,
    () => AR.not(self.result()),
    self.expression,
    self.sourceLocation
  )
}
