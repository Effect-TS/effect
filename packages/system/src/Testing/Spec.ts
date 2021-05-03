import * as T from "../Effect"
import { pipe } from "../Function"
import type * as M from "../Managed"
import type * as O from "../Option"
import type { SpecCase } from "./SpecCase"
import { SuiteCase, TestCase } from "./SpecCase"
import type { TestAnnotationMap } from "./TestAnnotationMap"

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
  annotations: TestAnnotationMap
): Spec<R, E, T> {
  return new Spec(new TestCase(label, test, annotations))
}

export type TestFailure<E> = ["TF", E]
export type TestSuccess = {}

export type ZSpec<R, E> = Spec<R, TestFailure<E>, TestSuccess>

export const TestAspectTypeId = Symbol.for("@effect-ts/system/Testing/TestAspect")
export type TestAspectTypeId = typeof TestAspectTypeId

type ZSpecLB<R, E, LowerR> = ZSpec<R, E> & [LowerR] extends [R]
  ? ZSpec<R, E>
  : ZSpec<LowerR, E>

/**
 * A `TestAspect` is an aspect that can be weaved into specs. You can think of
 * an aspect as a polymorphic function, capable of transforming one test into
 * another, possibly enlarging the environment or error type.
 */
export class TestAspect<LowerR, UpperR, LowerE, UpperE> {
  readonly [TestAspectTypeId]: TestAspectTypeId = TestAspectTypeId

  constructor(
    readonly some: (
      predicate: (s: string) => boolean
    ) => <R, E extends UpperE>(
      spec: ZSpecLB<R, E, LowerR>
    ) => ZSpec<R & UpperR, E | LowerE>
  ) {}
}

/**
 * An aspect that returns the tests unchanged
 */
export const identity: TestAspect<
  never,
  unknown,
  never,
  unknown
> = new TestAspect(() => (self) => self)

/**
 * Apply an aspect to a specific spec
 */
export function use<LowerR, UpperR, LowerE, UpperE>(
  aspect: TestAspect<LowerR, UpperR, LowerE, UpperE>
) {
  return <R, E extends UpperE>(
    self: ZSpecLB<R, E, LowerR>
  ): ZSpec<R & UpperR, E | LowerE> => aspect.some(() => true)(self)
}

export const x = pipe({} as ZSpec<{ foo: string }, "err">, use(identity))
