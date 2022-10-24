import type { Option } from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const SampleSym = Symbol.for("@effect/core/testing/Sample")

/**
 * @category symbol
 * @since 1.0.0
 */
export type SampleSym = typeof SampleSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const SampleEnvSym = Symbol.for("@effect/core/testing/Sample.R")

/**
 * @category symbol
 * @since 1.0.0
 */
export type SampleEnvSym = typeof SampleEnvSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const SampleValueSym = Symbol.for("@effect/core/testing/Sample.A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type SampleValueSym = typeof SampleValueSym

/**
 * A sample is a single observation from a random variable, together with a tree
 * of "shrinkings" used for minimization of "large" failures.
 *
 * @tsplus type effect/core/testing/Sample
 * @category model
 * @since 1.0.0
 */
export interface Sample<R, A> {
  readonly [SampleSym]: SampleSym
  readonly [SampleEnvSym]: () => R
  readonly [SampleValueSym]: () => A
  readonly value: A
  readonly shrink: Stream<R, never, Option<Sample<R, A>>>
}

/**
 * @tsplus type effect/core/testing/Sample.Ops
 * @category model
 * @since 1.0.0
 */
export interface SampleOps {
  <R, A>(value: A, shrink: Stream<R, never, Option<Sample<R, A>>>): Sample<R, A>
  readonly $: SampleAspects
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const Sample: SampleOps = Object.assign(
  <R, A>(value: A, shrink: Stream<R, never, Option<Sample<R, A>>>): Sample<R, A> => ({
    [SampleSym]: SampleSym,
    [SampleEnvSym]: undefined as any,
    [SampleValueSym]: undefined as any,
    value,
    shrink
  }),
  {
    $: {}
  }
)

/**
 * @tsplus type effect/core/testing/Sample.Aspects
 * @category model
 * @since 1.0.0
 */
export interface SampleAspects {}

/**
 * @tsplus unify effect/core/testing/Sample
 */
export function unifyGen<X extends Sample<any, any>>(
  self: X
): Sample<
  [X] extends [{ [SampleEnvSym]: () => infer R }] ? R : never,
  [X] extends [{ [SampleValueSym]: () => infer A }] ? A : never
> {
  return self
}
