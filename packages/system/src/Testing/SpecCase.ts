import * as T from "../Effect"
import * as M from "../Managed"
import type * as O from "../Option"
import type * as TAM from "./TestAnnotationMap"

export const SpecCaseTypeId = Symbol.for("@effect-ts/system/Testing/SpecCase")
export type SpecCaseTypeId = typeof SpecCaseTypeId

export abstract class SpecCase<R, E, T, A> {
  readonly [SpecCaseTypeId]: SpecCaseTypeId = SpecCaseTypeId;

  readonly [T._R]: (_: R) => void;
  readonly [T._E]: () => E;
  readonly [T._T]: () => T;
  readonly [T._A]: () => A

  map<B>(f: (a: A) => B): SpecCase<R, E, T, B> {
    concreteSpecCase(this)

    switch (this._tag) {
      case "SuiteCase": {
        return new SuiteCase(
          this.label,
          M.map_(this.specs, (_) => _.map(f)),
          this.exec
        )
      }
      case "TestCase": {
        return new TestCase(this.label, this.test, this.annotations)
      }
    }
  }
}

export function concreteSpecCase<R, E, T, A>(
  _: SpecCase<R, E, T, A>
): asserts _ is SuiteCase<R, E, A> | TestCase<R, E, T> {
  //
}

export class SuiteCase<R, E, A> extends SpecCase<R, E, never, A> {
  readonly _tag = "SuiteCase"

  constructor(
    readonly label: string,
    readonly specs: M.Managed<R, E, readonly A[]>,
    readonly exec: O.Option<T.ExecutionStrategy>
  ) {
    super()
  }
}

export class TestCase<R, E, T> extends SpecCase<R, E, T, never> {
  readonly _tag = "TestCase"

  constructor(
    readonly label: string,
    readonly test: T.Effect<R, E, T>,
    readonly annotations: TAM.TestAnnotationMap
  ) {
    super()
  }
}
