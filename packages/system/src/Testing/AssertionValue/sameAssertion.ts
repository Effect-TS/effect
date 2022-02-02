import * as ST from "../../Structural"
import type { AssertionValue } from "./AssertionValue"

export function sameAssertion_(self: AssertionValue, that: AssertionValue): boolean {
  return ST.equals(self.assertion, that.assertion)
}

export function sameAssertion(that: AssertionValue) {
  return (self: AssertionValue) => sameAssertion_(self, that)
}
