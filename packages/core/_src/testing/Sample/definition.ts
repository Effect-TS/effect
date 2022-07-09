export const SampleSym = Symbol.for("@effect/core/testing/Sample")
export type SampleSym = typeof SampleSym

export const SampleEnvSym = Symbol.for("@effect/core/testing/Sample.R")
export type SampleEnvSym = typeof SampleEnvSym

export const SampleValueSym = Symbol.for("@effect/core/testing/Sample.A")
export type SampleValueSym = typeof SampleValueSym

/**
 * A sample is a single observation from a random variable, together with a tree
 * of "shrinkings" used for minimization of "large" failures.
 *
 * @tsplus type effect/core/testing/Sample
 */
export interface Sample<R, A> {
  readonly [SampleSym]: SampleSym
  readonly [SampleEnvSym]: () => R
  readonly [SampleValueSym]: () => A
  readonly value: A
  readonly shrink: Stream<R, never, Maybe<Sample<R, A>>>
}

/**
 * @tsplus type effect/core/testing/Sample.Ops
 */
export interface SampleOps {
  <R, A>(value: A, shrink: Stream<R, never, Maybe<Sample<R, A>>>): Sample<R, A>
  readonly $: SampleAspects
}
export const Sample: SampleOps = Object.assign(
  <R, A>(value: A, shrink: Stream<R, never, Maybe<Sample<R, A>>>): Sample<R, A> => ({
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
