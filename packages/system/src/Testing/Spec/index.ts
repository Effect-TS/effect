// ets_tracing: off

import type { Cause } from "../../Cause/index.js"
import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as Tuple from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../../Effect/index.js"
import { pipe } from "../../Function/index.js"
import type { Has } from "../../Has/index.js"
import type { Layer } from "../../Layer/index.js"
import type { Managed } from "../../Managed/index.js"
import * as M from "../../Managed/index.js"
import * as O from "../../Option/index.js"
import * as Annotations from "../Annotations/index.js"
import type { TestAnnotation } from "../TestAnnotation/index.js"
import * as TAM from "../TestAnnotationMap/index.js"
import type { TestFailure } from "../TestFailure/index.js"
import type { TestSuccess } from "../TestSuccess/index.js"

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

export function provideLayer<R0, E, R>(layer: Layer<R0, E, R>) {
  return <E1, T1>(self: Spec<R, E1, T1>): Spec<R0, E | E1, T1> =>
    pipe(
      self,
      transform<R, E1, T1, R0, E | E1, T1>((_) => {
        concreteSpecCase(_)
        switch (_._tag) {
          case "SuiteCase":
            return new SuiteCase(_.label, M.provideLayer_(_.specs, layer), _.exec)
          case "TestCase":
            return new TestCase(_.label, T.provideLayer_(_.test, layer), _.annotations)
        }
      })
    )
}

export function forEachExec<E, T, R1, E1, A1, R2, E2, A2>(
  defExec: T.ExecutionStrategy,
  failure: (_: Cause<E>) => T.Effect<R1, E1, A1>,
  success: (_: T) => T.Effect<R2, E2, A2>
) {
  return <R>(
    self: Spec<R, E, T>
  ): Managed<R & R1 & R2, E1 | E2, Spec<R1 & R2, E1 | E2, A1 | A2>> =>
    pipe(
      self,
      foldM<R & R1 & R2, E1 | E2, Spec<R1 & R2, E1 | E2, A1 | A2>>(defExec)((_) => {
        concreteSpecCase(_)
        switch (_._tag) {
          case "SuiteCase": {
            const v = _
            return pipe(
              v.specs,
              M.foldCause(
                (e) => test(v.label, failure(e), TAM.TestAnnotationMap.empty),
                (t) => suite(v.label, M.succeed(t), v.exec)
              )
            )
          }
          case "TestCase": {
            const v = _

            return pipe(
              v.test,
              T.foldCause(
                (e) => test(v.label, failure(e), v.annotations),
                (e) => test(v.label, success(e), v.annotations)
              ),
              T.toManaged
            )
          }
        }
      })
    )
}

export function foldM<R1, E1, Z>(defExec: T.ExecutionStrategy) {
  return <R, E, T>(f: (_: SpecCase<R, E, T, Z>) => M.Managed<R1, E1, Z>) =>
    (self: Spec<R, E, T>): Managed<R & R1, E1, Z> => {
      concreteSpecCase(self.caseValue)
      switch (self.caseValue._tag) {
        case "SuiteCase": {
          const v = self.caseValue

          return pipe(
            v.specs,
            M.foldCauseM(
              (c) => f(new SuiteCase(v.label, M.halt(c), v.exec)),
              (_) =>
                pipe(
                  _,
                  M.forEachExec(
                    O.getOrElse_(v.exec, () => defExec),
                    (s) => pipe(s, foldM<R1, E1, Z>(defExec)(f), M.release)
                  ),
                  M.chain((z) =>
                    f(new SuiteCase(v.label, M.succeed(Chunk.toArray(z)), v.exec))
                  )
                )
            )
          )
        }
        case "TestCase":
          return f(self.caseValue)
      }
    }
}
