import * as List from "../../Collections/Immutable/List"
import * as T from "../../Effect/index.js"
import { SourceLocation } from "../../Fiber/index.js"
import { pipe } from "../../Function/index.js"
import * as M from "../../Managed/index.js"
import * as O from "../../Option/index.js"
import type * as Assert from "../Assertion"
import type { AssertionM } from "../AssertionM"
import type * as AR from "../AssertionResult"
import type * as AV from "../AssertionValue/AssertionValue"
import * as makeAssertionValue from "../AssertionValue/makeAssertionValue"
import * as sameAssertion_ from "../AssertionValue/sameAssertion"
import * as BA from "../BoolAlgebra/index.js"
import { FailureDetails } from "../FailureDetails"
import * as Spec from "../Spec/index.js"
import * as TA from "../TestAnnotation"
import { TestAnnotationMap } from "../TestAnnotationMap"
import * as TF from "../TestFailure"
import type { TestResult } from "../TestResult"
import * as TS from "../TestSuccess"

export function test(label: string, __trace?: string) {
  return (assertion: () => TestResult): Spec.ZSpec<unknown, never> =>
    testM(label, __trace)(() => T.succeedWith(assertion))
}

export function testM(label: string, __trace?: string) {
  return <R, E>(assertion: () => T.Effect<R, E, TestResult>): Spec.ZSpec<R, E> =>
    pipe(
      Spec.test(label, ZTest(assertion), TestAnnotationMap.empty),
      Spec.annotate(
        TA.location,
        __trace ? List.of(new SourceLocation(__trace)) : List.empty()
      )
    )
}

export function suite(label: string) {
  return <Tests extends Spec.ZSpec<any, any>[]>(
    ...tests: Tests
  ): Spec.ZSpec<
    [Tests[number]] extends [Spec.ZSpec<infer R, infer E>] ? R : never,
    [Tests[number]] extends [Spec.ZSpec<infer R, infer E>] ? E : never
  > => Spec.suite(label, M.succeed(tests), O.none)
}

function ZTest<R, E>(
  assertion: () => T.Effect<R, E, TestResult>
): T.Effect<R, TF.TestFailure<E>, TS.TestSuccess> {
  return pipe(
    T.suspend(assertion),
    T.foldCauseM(
      (c) => T.fail(TF.halt(c)),
      (r) =>
        O.fold_(
          BA.failures(r),
          () => T.succeed(new TS.Succeeded(BA.unit)),
          (failures) => T.fail(TF.assertion(failures))
        )
    )
  )
}

export function assert<A>(
  value: A,
  expression: O.Option<string> = O.none,
  sourceLocation: O.Option<string> = O.none
): (assertion: Assert.Assertion<A>) => TestResult {
  return (assertion) =>
    traverseResult(
      () => value,
      assertion.run(() => value),
      assertion,
      expression,
      sourceLocation
    )
}

function traverseResult<A>(
  value: () => A,
  assertResult: AR.AssertResult,
  assertion: AssertionM<A>,
  expression: O.Option<string>,
  sourceLocation: O.Option<string>
): TestResult {
  return pipe(
    assertResult,
    BA.chain((fragment) => {
      function loop(
        whole: AV.AssertionValue,
        failureDetails: FailureDetails
      ): TestResult {
        if (sameAssertion_.sameAssertion_(whole, failureDetails.assertion[0])) {
          return BA.success(failureDetails)
        }

        const fragment = whole.result()
        const result = BA.isSuccess(fragment) ? fragment : fragment["!"]
        return BA.chain_(result, (fragment) =>
          loop(fragment, new FailureDetails([whole, ...failureDetails.assertion]))
        )
      }

      return loop(
        fragment,
        new FailureDetails([
          makeAssertionValue.makeAssertionValue(
            assertion,
            value,
            () => assertResult,
            expression,
            sourceLocation
          )
        ])
      )
    })
  )
}
