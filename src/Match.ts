/**
 * @since 1.0.0
 */
import type * as Either from "./Either.js"
import * as internal from "./internal/matcher.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"
import type { UnionToIntersection } from "./Types.js"
import type { Unify } from "./Unify.js"

/**
 * @category type ids
 * @since 1.0.0
 */
export const MatcherTypeId: unique symbol = internal.TypeId

/**
 * @category type ids
 * @since 1.0.0
 */
export type MatcherTypeId = typeof MatcherTypeId

/**
 * @category model
 * @since 1.0.0
 */
export type Matcher<Input, Filters, RemainingApplied, Result, Provided> =
  | TypeMatcher<Input, Filters, RemainingApplied, Result>
  | ValueMatcher<Input, Filters, RemainingApplied, Result, Provided>

/**
 * @category model
 * @since 1.0.0
 */
export interface TypeMatcher<Input, Filters, Remaining, Result> extends Pipeable {
  readonly _tag: "TypeMatcher"
  readonly [MatcherTypeId]: {
    readonly _input: (_: Input) => unknown
    readonly _filters: (_: never) => Filters
    readonly _remaining: (_: never) => Remaining
    readonly _result: (_: never) => Result
  }
  readonly cases: ReadonlyArray<Case>
  readonly add: <I, R, RA, A>(_case: Case) => TypeMatcher<I, R, RA, A>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ValueMatcher<Input, Filters, Remaining, Result, Provided> extends Pipeable {
  readonly _tag: "ValueMatcher"
  readonly [MatcherTypeId]: {
    readonly _input: (_: Input) => unknown
    readonly _filters: (_: never) => Filters
    readonly _result: (_: never) => Result
  }
  readonly provided: Provided
  readonly value: Either.Either<Remaining, Provided>
  readonly add: <I, R, RA, A, Pr>(_case: Case) => ValueMatcher<I, R, RA, A, Pr>
}

/**
 * @category model
 * @since 1.0.0
 */
export type Case = When | Not

/**
 * @category model
 * @since 1.0.0
 */
export interface When {
  readonly _tag: "When"
  readonly guard: (u: unknown) => boolean
  readonly evaluate: (input: unknown) => any
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Not {
  readonly _tag: "Not"
  readonly guard: (u: unknown) => boolean
  readonly evaluate: (input: unknown) => any
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const type: <I>() => Matcher<I, Types.Without<never>, I, never, never> = internal.type

/**
 * @category constructors
 * @since 1.0.0
 */
export const value: <const I>(
  i: I
) => Matcher<I, Types.Without<never>, I, never, I> = internal.value

/**
 * @category constructors
 * @since 1.0.0
 */
export const valueTags: <
  const I,
  P extends {
    readonly [Tag in Types.Tags<"_tag", I> & string]: (
      _: Extract<I, { readonly _tag: Tag }>
    ) => any
  }
>(fields: P) => (input: I) => Unify<ReturnType<P[keyof P]>> = internal.valueTags

/**
 * @category constructors
 * @since 1.0.0
 */
export const typeTags: <I>() => <
  P extends {
    readonly [Tag in Types.Tags<"_tag", I> & string]: (
      _: Extract<I, { readonly _tag: Tag }>
    ) => any
  }
>(fields: P) => (input: I) => Unify<ReturnType<P[keyof P]>> = internal.typeTags

/**
 * @category combinators
 * @since 1.0.0
 */
export const when: <
  R,
  const P extends Types.PatternPrimitive<R> | Types.PatternBase<R>,
  Fn extends (_: Types.WhenMatch<R, P>) => unknown
>(
  pattern: P,
  f: Fn
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<P>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Types.PForExclude<P>>>,
  A | ReturnType<Fn>,
  Pr
> = internal.when as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const whenOr: <
  R,
  const P extends ReadonlyArray<
    Types.PatternPrimitive<R> | Types.PatternBase<R>
  >,
  Fn extends (_: Types.WhenMatch<R, P[number]>) => unknown
>(
  ...args: [...patterns: P, f: Fn]
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<P[number]>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Types.PForExclude<P[number]>>>,
  A | ReturnType<Fn>,
  Pr
> = internal.whenOr as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const whenAnd: <
  R,
  const P extends ReadonlyArray<
    Types.PatternPrimitive<R> | Types.PatternBase<R>
  >,
  Fn extends (_: Types.WhenMatch<R, Types.ArrayToIntersection<P>>) => unknown
>(
  ...args: [...patterns: P, f: Fn]
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<Types.ArrayToIntersection<P>>>,
  Types.ApplyFilters<
    I,
    Types.AddWithout<F, Types.PForExclude<Types.ArrayToIntersection<P>>>
  >,
  A | ReturnType<Fn>,
  Pr
> = internal.whenAnd as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const discriminator: <D extends string>(
  field: D
) => <R, P extends Types.Tags<D, R> & string, B>(
  ...pattern: [
    first: P,
    ...values: Array<P>,
    f: (_: Extract<R, Record<D, P>>) => B
  ]
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<D, P>>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<D, P>>>>,
  B | A,
  Pr
> = internal.discriminator

/**
 * @category combinators
 * @since 1.0.0
 */
export const discriminatorStartsWith: <D extends string>(
  field: D
) => <R, P extends string, B>(
  pattern: P,
  f: (_: Extract<R, Record<D, `${P}${string}`>>) => B
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<D, `${P}${string}`>>>,
  Types.ApplyFilters<
    I,
    Types.AddWithout<F, Extract<R, Record<D, `${P}${string}`>>>
  >,
  B | A,
  Pr
> = internal.discriminatorStartsWith as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const discriminators: <D extends string>(
  field: D
) => <
  R,
  P extends {
    readonly [Tag in Types.Tags<D, R> & string]?:
      | ((_: Extract<R, Record<D, Tag>>) => any)
      | undefined
  }
>(
  fields: P
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<D, keyof P>>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<D, keyof P>>>>,
  A | ReturnType<P[keyof P] & {}>,
  Pr
> = internal.discriminators

/**
 * @category combinators
 * @since 1.0.0
 */
export const discriminatorsExhaustive: <D extends string>(
  field: D
) => <
  R,
  P extends {
    readonly [Tag in Types.Tags<D, R> & string]: (
      _: Extract<R, Record<D, Tag>>
    ) => any
  }
>(
  fields: P
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (u: I) => Unify<A | ReturnType<P[keyof P]>>
  : Unify<A | ReturnType<P[keyof P]>> = internal.discriminatorsExhaustive

/**
 * @category combinators
 * @since 1.0.0
 */
export const tag: <R, P extends Types.Tags<"_tag", R> & string, B>(
  ...pattern: [
    first: P,
    ...values: Array<P>,
    f: (_: Extract<R, Record<"_tag", P>>) => B
  ]
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<"_tag", P>>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<"_tag", P>>>>,
  B | A,
  Pr
> = internal.tag

/**
 * @category combinators
 * @since 1.0.0
 */
export const tagStartsWith: <R, P extends string, B>(
  pattern: P,
  f: (_: Extract<R, Record<"_tag", `${P}${string}`>>) => B
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<"_tag", `${P}${string}`>>>,
  Types.ApplyFilters<
    I,
    Types.AddWithout<F, Extract<R, Record<"_tag", `${P}${string}`>>>
  >,
  B | A,
  Pr
> = internal.tagStartsWith as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const tags: <
  R,
  P extends {
    readonly [Tag in Types.Tags<"_tag", R> & string]?:
      | ((_: Extract<R, Record<"_tag", Tag>>) => any)
      | undefined
  }
>(
  fields: P
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<"_tag", keyof P>>>,
  Types.ApplyFilters<
    I,
    Types.AddWithout<F, Extract<R, Record<"_tag", keyof P>>>
  >,
  A | ReturnType<P[keyof P] & {}>,
  Pr
> = internal.tags

/**
 * @category combinators
 * @since 1.0.0
 */
export const tagsExhaustive: <
  R,
  P extends {
    readonly [Tag in Types.Tags<"_tag", R> & string]: (
      _: Extract<R, Record<"_tag", Tag>>
    ) => any
  }
>(
  fields: P
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (u: I) => Unify<A | ReturnType<P[keyof P]>>
  : Unify<A | ReturnType<P[keyof P]>> = internal.tagsExhaustive

/**
 * @category combinators
 * @since 1.0.0
 */
export const not: <
  R,
  const P extends Types.PatternPrimitive<R> | Types.PatternBase<R>,
  Fn extends (_: Types.NotMatch<R, P>) => unknown
>(
  pattern: P,
  f: Fn
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddOnly<F, Types.WhenMatch<R, P>>,
  Types.ApplyFilters<I, Types.AddOnly<F, Types.WhenMatch<R, P>>>,
  A | ReturnType<Fn>,
  Pr
> = internal.not as any

/**
 * @category predicates
 * @since 1.0.0
 */
export const nonEmptyString: SafeRefinement<string, never> = internal.nonEmptyString

/**
 * @category predicates
 * @since 1.0.0
 */
export const is: <
  Literals extends ReadonlyArray<string | number | bigint | boolean | null>
>(...literals: Literals) => Predicate.Refinement<unknown, Literals[number]> = internal.is

/**
 * @category predicates
 * @since 1.0.0
 */
export const string: Predicate.Refinement<unknown, string> = Predicate.isString

/**
 * @category predicates
 * @since 1.0.0
 */
export const number: Predicate.Refinement<unknown, number> = Predicate.isNumber

/**
 * @category predicates
 * @since 1.0.0
 */
export const any: SafeRefinement<unknown, any> = internal.any

/**
 * @category predicates
 * @since 1.0.0
 */
export const defined: <A>(u: A) => u is A & {} = internal.defined

/**
 * @category predicates
 * @since 1.0.0
 */
export const boolean: Predicate.Refinement<unknown, boolean> = Predicate.isBoolean

const _undefined: Predicate.Refinement<unknown, undefined> = Predicate.isUndefined
export {
  /**
   * @category predicates
   * @since 1.0.0
   */
  _undefined as undefined
}

const _null: Predicate.Refinement<unknown, null> = Predicate.isNull
export {
  /**
   * @category predicates
   * @since 1.0.0
   */
  _null as null
}

/**
 * @category predicates
 * @since 1.0.0
 */
export const bigint: Predicate.Refinement<unknown, bigint> = Predicate.isBigInt

/**
 * @category predicates
 * @since 1.0.0
 */
export const date: Predicate.Refinement<unknown, Date> = Predicate.isDate

/**
 * @category predicates
 * @since 1.0.0
 */
export const record: Predicate.Refinement<
  unknown,
  {
    [k: string]: any
    [k: symbol]: any
  }
> = Predicate.isRecord

/**
 * @category predicates
 * @since 1.0.0
 */
export const instanceOf: <A extends abstract new(...args: any) => any>(
  constructor: A
) => SafeRefinement<InstanceType<A>, never> = internal.instanceOf

/**
 * @category predicates
 * @since 1.0.0
 */
export const instanceOfUnsafe: <A extends abstract new(...args: any) => any>(
  constructor: A
) => SafeRefinement<InstanceType<A>, InstanceType<A>> = internal.instanceOf

/**
 * @category conversions
 * @since 1.0.0
 */
export const orElse: <RA, B>(
  f: (b: RA) => B
) => <I, R, A, Pr>(
  self: Matcher<I, R, RA, A, Pr>
) => [Pr] extends [never] ? (input: I) => Unify<B | A> : Unify<B | A> = internal.orElse

/**
 * @category conversions
 * @since 1.0.0
 */
export const orElseAbsurd: <I, R, RA, A, Pr>(
  self: Matcher<I, R, RA, A, Pr>
) => [Pr] extends [never] ? (input: I) => Unify<A> : Unify<A> = internal.orElseAbsurd

/**
 * @category conversions
 * @since 1.0.0
 */
export const either: <I, F, R, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (input: I) => Either.Either<R, Unify<A>>
  : Either.Either<R, Unify<A>> = internal.either

/**
 * @category conversions
 * @since 1.0.0
 */
export const option: <I, F, R, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (input: I) => Option.Option<Unify<A>>
  : Option.Option<Unify<A>> = internal.option

/**
 * @category conversions
 * @since 1.0.0
 */
export const exhaustive: <I, F, A, Pr>(
  self: Matcher<I, F, never, A, Pr>
) => [Pr] extends [never] ? (u: I) => Unify<A> : Unify<A> = internal.exhaustive

/**
 * @since 1.0.0
 * @category type ids
 */
export const SafeRefinementId = Symbol.for("effect/SafeRefinement")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SafeRefinementId = typeof SafeRefinementId

/**
 * @category model
 * @since 1.0.0
 */
export interface SafeRefinement<A, R = A> {
  readonly [SafeRefinementId]: (a: A) => R
}

const Fail = Symbol.for("effect/Fail")
type Fail = typeof Fail

/**
 * @since 1.0.0
 */
export declare namespace Types {
  /**
   * @since 1.0.0
   */
  export type WhenMatch<R, P> =
    // check for any
    [0] extends [1 & R] ? PForMatch<P>
      : P extends SafeRefinement<infer SP, never> ? SP
      : P extends Predicate.Refinement<infer _R, infer RP>
      // try to narrow refinement
        ? [Extract<R, RP>] extends [infer X] ? [X] extends [never]
            // fallback to original refinement
            ? RP
          : X
        : never
      : P extends PredicateA<infer PP> ? PP
      : ExtractMatch<R, PForMatch<P>>

  /**
   * @since 1.0.0
   */
  export type NotMatch<R, P> = Exclude<R, ExtractMatch<R, PForExclude<P>>>

  /**
   * @since 1.0.0
   */
  export type PForMatch<P> = [SafeRefinementP<ResolvePred<P>>] extends [infer X] ? X
    : never

  /**
   * @since 1.0.0
   */
  export type PForExclude<P> = [SafeRefinementR<ToSafeRefinement<P>>] extends [infer X] ? X
    : never

  // utilities
  type PredicateA<A> = Predicate.Predicate<A> | Predicate.Refinement<A, A>

  type SafeRefinementP<A> = A extends never ? never
    : A extends SafeRefinement<infer S, infer _> ? S
    : A extends Function ? A
    : A extends Record<string, any> ? DrainOuterGeneric<{ [K in keyof A]: SafeRefinementP<A[K]> }>
    : A

  type SafeRefinementR<A> = A extends never ? never
    : A extends SafeRefinement<infer _, infer R> ? R
    : A extends Function ? A
    : A extends Record<string, any> ? DrainOuterGeneric<{ [K in keyof A]: SafeRefinementR<A[K]> }>
    : A

  type ResolvePred<A> = A extends never ? never
    : A extends Predicate.Refinement<any, infer P> ? P
    : A extends Predicate.Predicate<infer P> ? P
    : A extends SafeRefinement<any> ? A
    : A extends Record<string, any> ? DrainOuterGeneric<{ [K in keyof A]: ResolvePred<A[K]> }>
    : A

  type ToSafeRefinement<A> = A extends never ? never
    : A extends Predicate.Refinement<any, infer P> ? SafeRefinement<P, P>
    : A extends Predicate.Predicate<infer P> ? SafeRefinement<P, never>
    : A extends SafeRefinement<any> ? A
    : A extends Record<string, any> ? DrainOuterGeneric<{ [K in keyof A]: ToSafeRefinement<A[K]> }>
    : NonLiteralsTo<A, never>

  type NonLiteralsTo<A, T> = [A] extends [string | number | boolean | bigint] ? [string] extends [A] ? T
    : [number] extends [A] ? T
    : [boolean] extends [A] ? T
    : [bigint] extends [A] ? T
    : A
    : A

  type DrainOuterGeneric<T> = [T] extends [unknown] ? T : never

  /**
   * @since 1.0.0
   */
  export type PatternBase<A> = A extends ReadonlyArray<infer _T> ? ReadonlyArray<any> | PatternPrimitive<A>
    : A extends Record<string, any> ? Partial<
        DrainOuterGeneric<
          { [K in keyof A]: PatternPrimitive<A[K] & {}> | PatternBase<A[K] & {}> }
        >
      >
    : never

  /**
   * @since 1.0.0
   */
  export type PatternPrimitive<A> = PredicateA<A> | A | SafeRefinement<any>

  /**
   * @since 1.0.0
   */
  export interface Without<X> {
    readonly _tag: "Without"
    readonly _X: X
  }

  /**
   * @since 1.0.0
   */
  export interface Only<X> {
    readonly _tag: "Only"
    readonly _X: X
  }

  /**
   * @since 1.0.0
   */
  export type AddWithout<A, X> = [A] extends [Without<infer WX>] ? Without<X | WX>
    : [A] extends [Only<infer OX>] ? Only<Exclude<OX, X>>
    : never

  /**
   * @since 1.0.0
   */
  export type AddOnly<A, X> = [A] extends [Without<infer WX>] ? [X] extends [WX] ? never
    : Only<X>
    : [A] extends [Only<infer OX>] ? [X] extends [OX] ? Only<X>
      : never
    : never

  /**
   * @since 1.0.0
   */
  export type ApplyFilters<I, A> = A extends Only<infer X> ? X
    : A extends Without<infer X> ? Exclude<I, X>
    : never

  /**
   * @since 1.0.0
   */
  export type Tags<D extends string, P> = P extends Record<D, infer X> ? X : never

  /**
   * @since 1.0.0
   */
  export type ArrayToIntersection<A extends ReadonlyArray<any>> = UnionToIntersection<
    A[number]
  >

  /**
   * @since 1.0.0
   */
  export type ExtractMatch<I, P> = [ExtractAndNarrow<I, P>] extends [infer EI] ? EI
    : never

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
  type IntersectOf<U extends unknown> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void ? I
    : never

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
  type Last<U extends any> = IntersectOf<
    U extends unknown ? (x: U) => void : never
  > extends (x: infer P) => void ? P
    : never

  type _ListOf<U, LN extends Array<any> = [], LastU = Last<U>> = {
    0: _ListOf<Exclude<U, LastU>, [LastU, ...LN]>
    1: LN
  }[[U] extends [never] ? 1 : 0]

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
  type ListOf<U extends any> = _ListOf<U> extends infer X ? X extends Array<any> ? X
    : []
    : never

  type IsUnion<T, U extends T = T> = (
    T extends any ? (U extends T ? false : true) : never
  ) extends false ? false
    : true

  type Replace<A, B> = A extends Function ? A
    : A extends Record<string | number, any> ? { [K in keyof A]: K extends keyof B ? Replace<A[K], B[K]> : A[K] }
    : [B] extends [A] ? B
    : A

  type MaybeReplace<I, P> = [P] extends [I] ? P
    : [I] extends [P] ? Replace<I, P>
    : Fail

  type BuiltInObjects =
    | Function
    | Date
    | RegExp
    | Generator
    | { readonly [Symbol.toStringTag]: string }

  type IsPlainObject<T> = T extends BuiltInObjects ? false
    : T extends Record<string, any> ? true
    : false

  type Simplify<A> = { [K in keyof A]: A[K] } & {}

  type ExtractAndNarrow<I, P> =
    // unknown is a wildcard pattern
    unknown extends P ? I
      : IsUnion<I> extends true ? ListOf<I> extends infer L ? L extends Array<any> ? Exclude<
              DrainOuterGeneric<
                { [K in keyof L]: ExtractAndNarrow<L[K], P> }
              >[number],
              Fail
            >
          : never
        : never
      : I extends ReadonlyArray<any> ? P extends ReadonlyArray<any> ? DrainOuterGeneric<
            {
              readonly [K in keyof I]: K extends keyof P ? ExtractAndNarrow<I[K], P[K]>
                : I[K]
            }
          > extends infer R ? Fail extends R[keyof R] ? never
            : R
          : never
        : never
      : IsPlainObject<I> extends true ? string extends keyof I ? I extends P ? I
          : never
        : symbol extends keyof I ? I extends P ? I
          : never
        : Simplify<
          DrainOuterGeneric<
            {
              [RK in Extract<keyof I, keyof P>]-?: ExtractAndNarrow<I[RK], P[RK]>
            }
          > & Omit<I, keyof P>
        > extends infer R ? [keyof P] extends [keyof RemoveFails<R>] ? R
          : never
        : never
      : MaybeReplace<I, P> extends infer R ? [I] extends [R] ? I
        : R
      : never

  type RemoveFails<A> = {
    [K in keyof A & {}]: A[K] extends Fail ? never : K
  }[keyof A] extends infer K ? [K] extends [keyof A] ? { [RK in K]: A[RK] }
    : {}
    : {}
}
