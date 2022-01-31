import * as AM from "../AssertionM/api.js"
import * as BA from "../BoolAlgebra"
import type { AssertionValue } from "./AssertionValue"
import { makeAssertionValue } from "./makeAssertionValue"

export function negate(self: AssertionValue): AssertionValue {
  return makeAssertionValue(
    AM.not(self.assertion),
    self.value,
    () => BA.not(self.result()),
    self.expression,
    self.sourceLocation
  )
}
