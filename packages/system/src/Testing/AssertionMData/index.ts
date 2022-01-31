// ets_tracing: off

import * as T from "../../Effect/index.js"
import type * as AM from "../AssertionM/AssertionM.js"
import type * as AR from "../AssertionResult/index.js"
import type * as ARM from "../AssertionResultM/index.js"
import * as makeAssertionValue from "../AssertionValue/makeAssertionValue.js"
import * as BA from "../BoolAlgebra/index.js"
import * as BAM from "../BoolAlgebraM/index.js"

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
