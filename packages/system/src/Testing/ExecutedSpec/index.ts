// ets_tracing: off

import * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import type * as TAM from "../TestAnnotationMap/index.js"
import type { TestFailure } from "../TestFailure/index.js"
import type { TestSuccess } from "../TestSuccess/index.js"

export const ExecutedSpecCaseTypeId = Symbol.for(
  "@effect-ts/system/Testing/ExecutedSpecCase"
)

export type ExecutedSpecCaseTypeId = typeof ExecutedSpecCaseTypeId

export abstract class ExecutedSpecCase<E, A> {
  readonly [ExecutedSpecCaseTypeId]: ExecutedSpecCaseTypeId = ExecutedSpecCaseTypeId;

  readonly [T._E]: () => E;
  readonly [T._A]: () => A

  map<B>(f: (a: A) => B): ExecutedSpecCase<E, B> {
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

export function concreteExecutedSpecCase<E, A>(
  _: ExecutedSpecCase<E, A>
): asserts _ is ExecutedSuiteCase<E, A> | ExecutedTestCase<E> {
  //
}

export class ExecutedSuiteCase<E, A> extends ExecutedSpecCase<E, A> {
  readonly _tag = "SuiteCase"

  constructor(readonly label: string, readonly specs: readonly A[]) {
    super()
  }
}

export class ExecutedTestCase<E> extends ExecutedSpecCase<E, never> {
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
export class ExecutedSpec<E> {
  readonly [SpecTypeId]: SpecTypeId = SpecTypeId;

  readonly [T._E]: () => E

  constructor(readonly caseValue: ExecutedSpecCase<E, ExecutedSpec<E>>) {}
}
