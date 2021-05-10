import * as List from "../Collections/Immutable/List"
import * as T from "../Effect"
import { SourceLocation } from "../Fiber"
import { pipe } from "../Function"
import * as O from "../Option"
import * as BA from "./BoolAlgebra"
import * as Spec from "./Spec"
import * as TA from "./TestAnnotation"
import { TestAnnotationMap } from "./TestAnnotationMap"
import * as TF from "./TestFailure"
import type { TestResult } from "./TestResult"
import * as TS from "./TestSuccess"

export function test(label: string, __trace?: string) {
  return (assertion: () => TestResult) =>
    testM(label, __trace)(() => T.succeedWith(assertion))
}

export function testM(label: string, __trace?: string) {
  return <R, E>(assertion: () => T.Effect<R, E, TestResult>) =>
    pipe(
      Spec.test(label, ZTest(assertion), TestAnnotationMap.empty),
      Spec.annotate(
        TA.location,
        __trace ? List.of(new SourceLocation(__trace)) : List.empty()
      )
    )
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
