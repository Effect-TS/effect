import * as T from "../../Effect"
import type * as AM from "../AssertionM/AssertionM"
import type * as AR from "../AssertionResult"
import type * as ARM from "../AssertionResultM"
import * as makeAssertionValue from "../AssertionValue/makeAssertionValue"
import * as BA from "../BoolAlgebra"
import * as BAM from "../BoolAlgebraM"

export interface AssertionMData {
  assertion: AM.AssertionM<any>
  value: any
}

export function makeAssertionMData(
  assertion: AM.AssertionM<any>,
  value: any
): AssertionMData {
  return { value, assertion }
}

export function asFailure(amd: AssertionMData): AR.AssertResult {
  return BA.failure(
    makeAssertionValue.makeAssertionValue(amd.assertion, amd.value, () =>
      asFailure(amd)
    )
  )
}

export function asSuccess(amd: AssertionMData): AR.AssertResult {
  return BA.failure(
    makeAssertionValue.makeAssertionValue(amd.assertion, amd.value, () =>
      asSuccess(amd)
    )
  )
}

export function asFailureM(amd: AssertionMData): ARM.AssertResultM {
  return new BAM.BoolAlgebraM(T.succeed(asFailure(amd)))
}

export function asSuccessM(amd: AssertionMData): ARM.AssertResultM {
  return new BAM.BoolAlgebraM(T.succeed(asSuccess(amd)))
}
