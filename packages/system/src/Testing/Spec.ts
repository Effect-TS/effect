import * as Tuple from "../Collections/Immutable/Tuple"
import * as T from "../Effect"
import { pipe } from "../Function"
import type { Has } from "../Has"
import * as M from "../Managed"
import type * as O from "../Option"
import * as Annotations from "./Annotations"
import type { TestAnnotation } from "./TestAnnotation"
import * as TAM from "./TestAnnotationMap"

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

export const SpecTypeId = Symbol.for("@effect-ts/system/Testing/Spec")
export type SpecTypeId = typeof SpecTypeId

/**
 * A `Spec[R, E, T]` is the backbone of _ZIO Test_. Every spec is either a
 * suite, which contains other specs, or a test of type `T`. All specs require
 * an environment of type `R` and may potentially fail with an error of type
 * `E`.
 */
export class Spec<R, E, T> {
  readonly [SpecTypeId]: SpecTypeId = SpecTypeId;

  readonly [T._R]: (_: R) => void;
  readonly [T._E]: () => E;
  readonly [T._T]: () => T

  constructor(readonly caseValue: SpecCase<R, E, T, Spec<R, E, T>>) {}
}

export function suite<R, E, T>(
  label: string,
  specs: M.Managed<R, E, readonly Spec<R, E, T>[]>,
  exec: O.Option<T.ExecutionStrategy>
): Spec<R, E, T> {
  return new Spec(new SuiteCase(label, specs, exec))
}

export function test<R, E, T>(
  label: string,
  test: T.Effect<R, E, T>,
  annotations: TAM.TestAnnotationMap
): Spec<R, E, T> {
  return new Spec(new TestCase(label, test, annotations))
}

export type TestFailure<E> = ["TF", E]
export type TestSuccess = {}

export type ZSpec<R, E> = Spec<R, TestFailure<E>, TestSuccess>

/**
 * Transforms the spec one layer at a time.
 */
export function transform<R, E, T, R1, E1, T1>(
  f: (_: SpecCase<R, E, T, Spec<R1, E1, T1>>) => SpecCase<R1, E1, T1, Spec<R1, E1, T1>>
) {
  return (spec: Spec<R, E, T>): Spec<R1, E1, T1> => {
    concreteSpecCase(spec.caseValue)
    switch (spec.caseValue._tag) {
      case "SuiteCase": {
        return new Spec(
          f(
            new SuiteCase(
              spec.caseValue.label,
              M.map_(spec.caseValue.specs, (_) => _.map(transform(f))),
              spec.caseValue.exec
            )
          )
        )
      }
      case "TestCase": {
        return new Spec(f(spec.caseValue))
      }
    }
  }
}

/**
 * Annotates each test in this spec with the specified test annotation.
 */
export function annotate<V>(key: TestAnnotation<V>, value: V) {
  return <R, E, T>(self: Spec<R, E, T>): Spec<R, E, T> =>
    pipe(
      self,
      transform((specCase) => {
        concreteSpecCase(specCase)
        switch (specCase._tag) {
          case "SuiteCase": {
            return specCase
          }
          case "TestCase": {
            return new TestCase(
              specCase.label,
              specCase.test,
              specCase.annotations["|>"](TAM.annotate(key, value))
            )
          }
        }
      })
    )
}

/**
 * Returns a new spec with the annotation map at each node.
 */
export function annotated<R, E, T>(
  self: Spec<R, E, T>
): Spec<
  R & Has<Annotations.Annotations>,
  Annotations.Annotated<E>,
  Annotations.Annotated<T>
> {
  return pipe(
    self,
    transform((specCase) => {
      concreteSpecCase(specCase)
      switch (specCase._tag) {
        case "SuiteCase": {
          return new SuiteCase(
            specCase.label,
            M.mapError_(specCase.specs, (_) =>
              Tuple.tuple(_, TAM.TestAnnotationMap.empty)
            ),
            specCase.exec
          )
        }
        case "TestCase": {
          return new TestCase(
            specCase.label,
            Annotations.withAnnotation(specCase.test),
            specCase.annotations
          )
        }
      }
    })
  )
}
