import type { Option } from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const GenSym = Symbol.for("@effect/core/testing/Gen")

/**
 * @category symbol
 * @since 1.0.0
 */
export type GenSym = typeof GenSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const GenEnvSym = Symbol.for("@effect/core/testing/Gen.R")

/**
 * @category symbol
 * @since 1.0.0
 */
export type GenEnvSym = typeof GenEnvSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const GenValueSym = Symbol.for("@effect/core/testing/Gen.A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type GenValueSym = typeof GenValueSym

/**
 * A `Gen<R, A>` represents a generator of values of type `A`, which requires an
 * environment `R`. Generators may be random or deterministic.
 *
 * @tsplus type effect/core/testing/Gen
 * @category model
 * @since 1.0.0
 */
export interface Gen<R, A> {
  readonly [GenSym]: GenSym
  readonly [GenEnvSym]: () => R
  readonly [GenValueSym]: () => A
  readonly sample: Stream<R, never, Option<Sample<R, A>>>
}

/**
 * @tsplus type effect/core/testing/Gen.Ops
 * @category model
 * @since 1.0.0
 */
export interface GenOps {
  <R, A>(sample: Stream<R, never, Option<Sample<R, A>>>): Gen<R, A>
  readonly $: GenAspects
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const Gen: GenOps = Object.assign(
  <R, A>(sample: Stream<R, never, Option<Sample<R, A>>>): Gen<R, A> => ({
    [GenSym]: GenSym,
    [GenEnvSym]: undefined as any,
    [GenValueSym]: undefined as any,
    sample
  })
)

/**
 * @tsplus type effect/core/testing/Gen.Aspects
 * @category models
 * @since 1.0.0
 */
export interface GenAspects {}

/**
 * @tsplus unify effect/core/testing/Gen
 */
export function unifyGen<X extends Gen<any, any>>(
  self: X
): Gen<
  [X] extends [{ [GenEnvSym]: () => infer R }] ? R : never,
  [X] extends [{ [GenValueSym]: () => infer A }] ? A : never
> {
  return self
}

/**
 * @category models
 * @since 1.0.0
 */
export interface LengthConstraints {
  readonly minLength?: number
  readonly maxLength?: number
}

/**
 * @category models
 * @since 1.0.0
 */
export interface EqualsConstraint<A> {
  readonly equals: (a: A, b: A) => boolean
}

/**
 * @category models
 * @since 1.0.0
 */
export interface DateConstraints {
  readonly min?: Date
  readonly max?: Date
}

/**
 * @category models
 * @since 1.0.0
 */
export interface ObjectConstraints {
  readonly maxDepth?: number
  readonly maxKeys?: number
  readonly key?: Gen<any, string>
  readonly values?: Gen<any, any>[]
  readonly withSet?: boolean
  readonly withMap?: boolean
  readonly withBigint?: boolean
  readonly withDate?: boolean
  readonly withTypedArray?: boolean
}

/**
 * @category models
 * @since 1.0.0
 */
export interface NumberConstraints {
  readonly min?: number
  readonly max?: number
}

/**
 * @category models
 * @since 1.0.0
 */
export interface FloatConstraints {
  readonly noDefaultInfinity?: boolean
  readonly noNaN?: boolean
}
