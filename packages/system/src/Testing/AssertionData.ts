import type * as A from "./Assertion"
import type * as AR from "./AssertionResult"
import * as AV from "./AssertionValue"
import * as BA from "./BoolAlgebra"

export interface AssertionData {
  assertion: A.Assertion<any>
  value: any
}

export function makeAssertionData(
  assertion: A.Assertion<any>,
  value: any
): AssertionData {
  return { value, assertion }
}

export function asFailure(ad: AssertionData): AR.AssertResult {
  return BA.failure(AV.makeAssertionValue(ad.assertion, ad.value, () => asFailure(ad)))
}

export function asSuccess(ad: AssertionData): AR.AssertResult {
  return BA.failure(AV.makeAssertionValue(ad.assertion, ad.value, () => asSuccess(ad)))
}
