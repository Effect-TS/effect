import * as T from "../Effect"
import * as E from "../Either"
import type { TestFailure, TestSuccess } from "./Spec"
import type * as TAM from "./TestAnnotationMap"

export const ExecutedSpecCaseTypeId = Symbol.for(
  "@effect-ts/system/Testing/ExecutedSpecCase"
)

export type ExecutedSpecCaseTypeId = typeof ExecutedSpecCaseTypeId

export abstract class ExecutedSpecCase<E, T, A> {
  readonly [ExecutedSpecCaseTypeId]: ExecutedSpecCaseTypeId = ExecutedSpecCaseTypeId;

  readonly [T._E]: () => E;
  readonly [T._T]: () => T;
  readonly [T._A]: () => A

  map<B>(f: (a: A) => B): ExecutedSpecCase<E, T, B> {
    concreteExecutedSpecCase(this)

    switch (this._tag) {
      case "SuiteCase": {
        return new ExecutedSuiteCase(this.label, this.specs.map(f))
      }
      case "TestCase": {
        return new ExecutedTestCase(this.label, this.test, this.annotations)
      }
    }
  }
}

export function concreteExecutedSpecCase<E, T, A>(
  _: ExecutedSpecCase<E, T, A>
): asserts _ is ExecutedSuiteCase<E, A> | ExecutedTestCase<E, T> {
  //
}

export class ExecutedSuiteCase<E, A> extends ExecutedSpecCase<E, never, A> {
  readonly _tag = "SuiteCase"

  constructor(readonly label: string, readonly specs: readonly A[]) {
    super()
  }
}

export class ExecutedTestCase<E, T> extends ExecutedSpecCase<E, T, never> {
  readonly _tag = "TestCase"

  constructor(
    readonly label: string,
    readonly test: E.Either<TestFailure<E>, TestSuccess>,
    readonly annotations: TAM.TestAnnotationMap
  ) {
    super()
  }
}

export const SpecTypeId = Symbol.for("@effect-ts/system/Testing/Spec")
export type SpecTypeId = typeof SpecTypeId

/**
 * An `ExecutedSpec` is a spec that has been run to produce test results.
 */
export class ExecutedSpec<E, T> {
  readonly [SpecTypeId]: SpecTypeId = SpecTypeId;

  readonly [T._E]: () => E;
  readonly [T._T]: () => T

  constructor(readonly caseValue: ExecutedSpecCase<E, T, ExecutedSpec<E, T>>) {}
}
