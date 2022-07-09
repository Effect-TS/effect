export const GenSym = Symbol.for("@effect/core/testing/Gen")
export type GenSym = typeof GenSym

export const GenEnvSym = Symbol.for("@effect/core/testing/Gen.R")
export type GenEnvSym = typeof GenEnvSym

export const GenValueSym = Symbol.for("@effect/core/testing/Gen.A")
export type GenValueSym = typeof GenValueSym

/**
 * A `Gen<R, A>` represents a generator of values of type `A`, which requires an
 * environment `R`. Generators may be random or deterministic.
 *
 * @tsplus type effect/core/testing/Gen
 */
export interface Gen<R, A> {
  readonly [GenSym]: GenSym
  readonly [GenEnvSym]: () => R
  readonly [GenValueSym]: () => A
  readonly sample: Stream<R, never, Maybe<Sample<R, A>>>
}

/**
 * @tsplus type effect/core/testing/Gen.Ops
 */
export interface GenOps {
  <R, A>(sample: Stream<R, never, Maybe<Sample<R, A>>>): Gen<R, A>
  readonly $: GenAspects
}
export const Gen: GenOps = Object.assign(
  <R, A>(sample: Stream<R, never, Maybe<Sample<R, A>>>): Gen<R, A> => ({
    [GenSym]: GenSym,
    [GenEnvSym]: undefined as any,
    [GenValueSym]: undefined as any,
    sample
  })
)

/**
 * @tsplus type effect/core/testing/Gen.Aspects
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

export interface LengthConstraints {
  readonly minLength?: number
  readonly maxLength?: number
}

export interface EquivalenceConstraint<A> {
  readonly equivalence?: Equivalence<A>
}

export interface DateConstraints {
  readonly min?: Date
  readonly max?: Date
}

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

export interface NumberConstraints {
  readonly min?: number
  readonly max?: number
}

export interface FloatConstraints {
  readonly noDefaultInfinity?: boolean
  readonly noNaN?: boolean
}
