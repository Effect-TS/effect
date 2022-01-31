import * as AM from "../AssertionM/api.js"
import type { AssertionValue } from "../AssertionValue/index.js"
import * as BA from "../BoolAlgebra/index.js"
import { makeAssertionValue } from "./makeAssertionValue.js"

export function negate(self: AssertionValue): AssertionValue {
  return makeAssertionValue(
    AM.not(self.assertion),
    self.value,
    () => BA.not(self.result()),
    self.expression,
    self.sourceLocation
  )
}
