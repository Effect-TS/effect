import { makeAssociative } from "@effect-ts/core/Associative"
// [XPureURI]: XPure<X, S, S, R, E, A>
import type * as AR from "@effect-ts/core/Collections/Immutable/Array"
import type { Tuple } from "@effect-ts/core/Collections/Immutable/Tuple"
import type * as EI from "@effect-ts/core/Either"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"
import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"
import type * as PFX from "@effect-ts/core/Prelude/FX"
import type { Either } from "@effect-ts/system/Either"
import type { Option } from "@effect-ts/system/Option"

import type { EffectF, EffectURI } from "../../src/Effect"
import * as T from "../../src/Effect"
import { constant, pipe } from "../../src/Function"
import * as PV2 from "../../src/PreludeV2"
import type * as PV2FX from "../../src/PreludeV2/FX"
// -------------------------------------------------------------------------------------
// XPureState
// -------------------------------------------------------------------------------------
import * as XS from "../../src/XPure/XState"

// -------------------------------------------------------------------------------------
// MATCHERS
// -------------------------------------------------------------------------------------
/**
 * Asserts at compile time that the provided type argument's type resolves to the expected boolean literal type.
 * @param expectTrue - True if the passed in type argument resolved to true.
 */
export function assert<T extends true | false>(expectTrue: T) {}

/**
 * Asserts at compile time that the provided type argument's type resolves to true.
 */
export type AssertTrue<T extends true> = never

/**
 * Asserts at compile time that the provided type argument's type resolves to false.
 */
export type AssertFalse<T extends false> = never

/**
 * Asserts at compile time that the provided type argument's type resolves to the expected boolean literal type.
 */
export type Assert<T extends true | false, Expected extends T> = never

/**
 * Checks if type `T` has the specified type `U`.
 */
export type _Has<T, U> = IsAny<T> extends true
  ? true
  : IsAny<U> extends true
  ? false
  : Extract<T, U> extends never
  ? false
  : true

/**
 * Checks if type `T` does not have the specified type `U`.
 */
export type NotHas<T, U> = _Has<T, U> extends false ? true : false

/**
 * Checks if type `T` is possibly null or undefined.
 */
export type IsNullable<T> = Extract<T, null | undefined> extends never ? false : true

/**
 * Checks if type `T` exactly matches type `U`.
 */
export type IsExact<T, U> = TupleMatches<AnyToBrand<T>, AnyToBrand<U>> extends true
  ? TupleMatches<
      DeepMakeRequiredForIsExact<T>,
      DeepMakeRequiredForIsExact<U>
    > extends true // catch optional properties
    ? true
    : false
  : false

type DeepMakeRequiredForIsExact<T> = {
  [P in keyof T]-?: DeepMakeRequiredForIsExact<AnyToBrand<T[P]>>
}

/**
 * Checks if type `T` is the `any` type.
 */
// https://stackoverflow.com/a/49928360/3406963
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Checks if type `T` is the `never` type.
 */
export type IsNever<T> = [T] extends [never] ? true : false

/**
 * Checks if type `T` is the `unknown` type.
 */
export type IsUnknown<T> = IsNever<T> extends false
  ? T extends unknown
    ? unknown extends T
      ? IsAny<T> extends false
        ? true
        : false
      : false
    : false
  : false

type TupleMatches<T, U> = Matches<[T], [U]> extends true ? true : false
type Matches<T, U> = T extends U ? (U extends T ? true : false) : false

type AnyToBrand<T> = IsAny<T> extends true
  ? { __conditionalTypeChecksAny__: undefined }
  : T

// -------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------
const fa = null as any as T.Effect<{ envA: "ENV_A" }, "E_A", { resultA: "A" }>
const fb = null as any as T.Effect<{ envB: "ENV_B" }, "E_B", { resultB: "B" }>
const fab = null as any as (a: { envA: "ENV_A" }) => typeof fb
const V1Monad = P.instance<P.Monad<[P.URI<T.EffectURI>]>>(null as any)

// -------------------------------------------------------------------------------------
// DSL.succeed
// -------------------------------------------------------------------------------------
const succeedFTest = PV2.succeedF(
  PV2.instance<PV2.Covariant<EffectF>>(null as any),
  PV2.instance<PV2.Any<EffectF>>(null as any)
)("passed_in_value" as const)

assert<IsExact<typeof succeedFTest, T.Effect<unknown, never, "passed_in_value">>>(true)

// -------------------------------------------------------------------------------------
// DSL.chain
// -------------------------------------------------------------------------------------
// const chainFInstance = PV2.chainF(PV2.instance<PV2.Monad<EffectF>>(null as any))
const chainFInstance = P.chainF(
  P.instance<P.Monad<[P.URI<T.EffectURI>], T.V>>(null as any)
)
const chainFTest = pipe(
  fa,
  chainFInstance(({ resultA }) =>
    pipe(
      fb,
      T.map(({ resultB }) => [resultA, resultB] as const)
    )
  )
)

assert<
  IsExact<
    typeof chainFTest,
    T.Effect<{ envB: "ENV_B" } & { envA: "ENV_A" }, "E_A" | "E_B", readonly ["A", "B"]>
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.conditional
// -------------------------------------------------------------------------------------
const conditionalFTest = PV2.conditionalF<EffectF>()(
  () => fa,
  () => fb
)(true)

assert<
  IsExact<
    typeof conditionalFTest,
    T.Effect<
      { envA: "ENV_A" } & { envB: "ENV_B" },
      "E_A" | "E_B",
      { resultA: "A" } | { resultB: "B" }
    >
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.alternative
// -------------------------------------------------------------------------------------
// const orElseFTest = pipe(
//   fa,
//   P.orElseF({
//     ...P.instance<P.Covariant<[P.URI<EffectURI>], T.V>>(null as any),
//     ...P.instance<P.AssociativeEither<[P.URI<EffectURI>], T.V>>(null as any)
//   })(() => fb)
// )
const orElseFTest = pipe(
  fa,
  PV2.orElseF(
    PV2.instance<PV2.Covariant<EffectF>>(null as any),
    PV2.instance<PV2.AssociativeEither<EffectF>>(null as any)
  )(() => fb)
)

assert<
  IsExact<
    typeof orElseFTest,
    T.Effect<
      { envA: "ENV_A" } & { envB: "ENV_B" },
      "E_A" | "E_B",
      { resultA: "A" } | { resultB: "B" }
    >
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.apF
// -------------------------------------------------------------------------------------
// const apFTest = pipe(
//   null as any as T.Effect<{ envB: "ENV_B" }, "B_ERROR", (a: { resultA: "A" }) => "A">,
//   P.apF(P.instance<P.Apply<[P.URI<EffectURI>], T.V>>(null as any))(fa)
// )
const apFTest = pipe(
  null as any as T.Effect<{ envB: "ENV_B" }, "B_ERROR", (a: { resultA: "A" }) => "A">,
  PV2.apF(PV2.instance<PV2.Apply<EffectF>>(null as any))(fa)
)
assert<
  IsExact<
    typeof apFTest,
    T.Effect<{ envA: "ENV_A" } & { envB: "ENV_B" }, "B_ERROR" | "E_A", "A">
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.access-provide
// -------------------------------------------------------------------------------------
const accessMFTest = PV2.accessMF(
  PV2.instance<PV2.FX.Access<EffectF>>(null as any),
  PV2.instance<PV2.AssociativeFlatten<EffectF>>(null as any)
)(
  (e2: { env2: "ENV_2" }) =>
    null as any as T.Effect<{ env1: "ENV_1" }, "ACCESS_ERROR", "ACCESS_RESULT">
)

assert<
  IsExact<
    typeof accessMFTest,
    T.Effect<{ env1: "ENV_1" } & { env2: "ENV_2" }, "ACCESS_ERROR", "ACCESS_RESULT">
  >
>(true)

interface EffectFixedEnvF extends PV2.HKT {
  readonly type: PV2.Kind<
    EffectF,
    this["X"],
    this["I"],
    { fixedEnv: "FIXED_ENV" },
    this["E"],
    this["A"]
  >
}

const accessMFFIXEDTest = PV2.accessMF(
  PV2.instance<PV2.FX.Access<EffectFixedEnvF>>(null as any),
  PV2.instance<PV2.AssociativeFlatten<EffectFixedEnvF>>(null as any)
)

assert<
  IsExact<
    typeof accessMFFIXEDTest,
    <K, Q, W, X, I, S, R, R2, E, A>(
      f: (r: { fixedEnv: "FIXED_ENV" }) => T.Effect<{ fixedEnv: "FIXED_ENV" }, E, A>
    ) => T.Effect<{ fixedEnv: "FIXED_ENV" }, E, A>
  >
>(true)

type RandomService = {
  readonly __randomService: "RandomService"
}
const accessServiceMFTest = PV2.accessServiceMF(
  PV2.instance<PV2FX.Access<EffectF>>(null as any),
  PV2.instance<PV2.Monad<EffectF>>(null as any)
)(tag<RandomService>())

assert<
  IsExact<
    typeof accessServiceMFTest,
    <X, I, R, E, A>(
      f: (_: RandomService) => T.Effect<R, E, A>
    ) => T.Effect<R & Has<RandomService>, E, A>
  >
>(true)

const provideSomeFTest = P.provideSomeF({
  ...P.instance<PFX.Access<[P.URI<T.EffectURI>], P.V<"R", "-">>>(null as any),
  ...P.instance<P.Monad<[P.URI<T.EffectURI>], P.V<"R", "-">>>(null as any),
  ...P.instance<PFX.Provide<[P.URI<T.EffectURI>], P.V<"R", "-">>>(null as any)
})

assert<
  IsExact<
    typeof provideSomeFTest,
    <R, R2>(
      f: (_: R2) => R
    ) => <K, Q, W, X, I, S, E, A>(fa: T.Effect<R, E, A>) => T.Effect<R2, E, A>
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.do
// -------------------------------------------------------------------------------------
const PV2Do = PV2.getDo(T.Monad)
const doFTest = pipe(
  PV2Do.do,
  PV2Do.bind("fa", () => fa),
  PV2Do.bind("fb", () => fb),
  PV2Do.let("letz", () => "LET_VALUE" as const),
  T.map(({ fa, fb, letz }) => [fa, fb, letz] as const)
)

assert<
  IsExact<
    typeof doFTest,
    T.Effect<
      { envB: "ENV_B" } & { envA: "ENV_A" },
      "E_A" | "E_B",
      readonly [{ resultA: "A" }, { resultB: "B" }, "LET_VALUE"]
    >
  >
>(true)

// -------------------------------------------------------------------------------------
// DSL.gen
// -------------------------------------------------------------------------------------
const genFTest = PV2.genF(T.Monad)(function* (_) {
  const a = yield* _(fa)
  const b = yield* _(fb)
  const e = yield* _(T.fail("E" as const))
  return [a, b, e] as const
})

assert<
  IsExact<
    typeof genFTest,
    T.Effect<
      { envA: "ENV_A" } & { envB: "ENV_B" },
      "E" | "E_A" | "E_B",
      readonly [{ resultA: "A" }, { resultB: "B" }, never]
    >
  >
>(true)

// -------------------------------------------------------------------------------------
// Typeclasses
// -------------------------------------------------------------------------------------
const AnyInstance = PV2.instance<PV2.Any<EffectF>>(null as any)
const AnyTest = AnyInstance.any()
assert<IsExact<typeof AnyTest, T.Effect<unknown, never, unknown>>>(true)

const AssociativeBothInstance = PV2.instance<PV2.AssociativeBoth<EffectF>>(null as any)
const AssociativeBothTest = pipe(fa, AssociativeBothInstance.both(fb))
assert<
  IsExact<
    typeof AssociativeBothTest,
    T.Effect<
      { envB: "ENV_B" } & { envA: "ENV_A" },
      "E_A" | "E_B",
      Tuple<[{ resultA: "A" }, { resultB: "B" }]>
    >
  >
>(true)

// const AssociativeComposeInstance = P.instance<
//   P.AssociativeCompose<[P.URI<EffectURI>], T.V>
// >(null as any)
const AssociativeComposeInstance = PV2.instance<PV2.AssociativeCompose<EffectF>>(
  null as any
)
const AssociativeComposeTest = pipe(
  fa,
  AssociativeComposeInstance.compose(
    null as any as T.Effect<{ resultA: "A" }, "E_B", { resultB: "B" }>
  )
)
assert<
  IsExact<
    typeof AssociativeComposeTest,
    T.Effect<{ resultA: "A" } & { envA: "ENV_A" }, "E_A" | "E_B", { resultB: "B" }>
  >
>(true)

// const AssociativeEitherInstance = P.instance<
//   P.AssociativeEither<[P.URI<EffectURI>], T.V>
// >(null as any)
const AssociativeEitherInstance = PV2.instance<PV2.AssociativeEither<EffectF>>(
  null as any
)
const AssociativeEitherTest = pipe(
  fa,
  AssociativeEitherInstance.orElseEither(() => fb)
)
assert<
  IsExact<
    typeof AssociativeEitherTest,
    T.Effect<
      { envB: "ENV_B" } & { envA: "ENV_A" },
      "E_A" | "E_B",
      Either<{ resultA: "A" }, { resultB: "B" }>
    >
  >
>(true)

// const AssociativeFlattenInstance = P.instance<
//   P.AssociativeFlatten<[P.URI<EffectURI>], T.V>
// >(null as any)
const AssociativeFlattenInstance = PV2.instance<PV2.AssociativeFlatten<EffectF>>(
  null as any
)
const AssociativeFlattenTest = AssociativeFlattenInstance.flatten(
  null as any as T.Effect<{ envA: "ENV_A" }, "E_A", typeof fb>
)
assert<
  IsExact<
    typeof AssociativeFlattenTest,
    T.Effect<{ envA: "ENV_A" } & { envB: "ENV_B" }, "E_B" | "E_A", { resultB: "B" }>
  >
>(true)

const ChainRecInstance = PV2.instance<PV2.ChainRec<EffectF>>(null as any)
const ChainRecTest = pipe(
  ChainRecInstance.chainRec(
    (a: { recursValue: "recurs_value" }) =>
      null as any as T.Effect<
        { envA: "ENV_A" },
        "E_A",
        Either<{ recursValue: "recurs_value" }, "recurs_result">
      >
  )
)
assert<
  IsExact<
    typeof ChainRecTest,
    (a: {
      recursValue: "recurs_value"
    }) => T.Effect<{ envA: "ENV_A" }, "E_A", "recurs_result">
  >
>(true)

const CollectionInstance = P.instance<P.Collection<[P.URI<EffectURI>], T.V>>(
  null as any
)
const CollectionTest = CollectionInstance.builder<string>().build()
assert<IsExact<typeof CollectionTest, T.Effect<unknown, never, string>>>(true)

// const CompactInstance = P.instance<P.Compact<[P.URI<EffectURI>], T.V>>(null as any)
const CompactInstance = PV2.instance<PV2.Compact<EffectF>>(null as any)
const CompactTest = CompactInstance.compact(
  null as any as T.Effect<{ envA: "ENV_A" }, "E_A", Option<{ resultA: "A" }>>
)
assert<
  IsExact<typeof CompactTest, T.Effect<{ envA: "ENV_A" }, "E_A", { resultA: "A" }>>
>(true)

// const ForeachFnInstance = P.instance<P.ForeachFn<[P.URI<EitherURI>], T.V>>(null as any)
const ForeachFnInstance = PV2.instance<PV2.ForeachFn<EI.EitherF>>(null as any)
const ForeachFnTest = pipe(
  null as any as EI.Either<"E_A", { resultA: "A" }>,
  ForeachFnInstance({
    ...PV2.instance<PV2.Applicative<T.EffectF>>(null as any)
  })((a) => pipe(fb, T.map(constant(a.resultA))))
)
assert<
  IsExact<
    typeof ForeachFnTest,
    T.Effect<{ envB: "ENV_B" }, "E_B", EI.Either<"E_A", "A">>
  >
>(true)

// const ForEachWithIndexFnInstance = P.instance<
//   P.ForEachWithIndexFn<[P.URI<ArrayURI>], T.V>
// >(null as any)
const ForEachWithIndexFnInstance = PV2.instance<
  PV2.ForEachWithIndexFn<number, AR.ArrayF>
>(null as any)
const ForEachWithIndexFnTest = pipe(
  null as any as AR.Array<{ resultA: "A" }>,
  ForEachWithIndexFnInstance({
    ...PV2.instance<PV2.Applicative<EffectF>>(null as any)
  })((i, a) =>
    pipe(
      fb,
      T.map(() => [i, a] as const)
    )
  )
)
assert<
  IsExact<
    typeof ForEachWithIndexFnTest,
    T.Effect<{ envB: "ENV_B" }, "E_B", AR.Array<readonly [number, { resultA: "A" }]>>
  >
>(true)

// -------------------------------------------------------------------------------------
// FX.Run
// -------------------------------------------------------------------------------------
// const RunInstance = P.instance<PFX.Run<[P.URI<EffectURI>], T.V>>(null as any)
const RunInstance = PV2.instance<PV2FX.Run<EffectF>>(null as any)
const RunTest = RunInstance.either(fa)
assert<
  IsExact<
    typeof RunTest,
    T.Effect<{ envA: "ENV_A" }, never, EI.Either<"E_A", { resultA: "A" }>>
  >
>(true)

// -------------------------------------------------------------------------------------
// FX.Run (Fixed)
// -------------------------------------------------------------------------------------
// const RunFixedInstance = P.instance<
//   PFX.Run<[P.URI<EffectURI>], T.V & P.Fix<"E", string[]>>
// >(null as any)
type EffectFixedF = PV2.Fixed<EffectF, PV2.Fix<"E", string[]>>

interface EffectFixedCustomF extends PV2.HKT<PV2.Fix<"E", string[]>> {
  readonly type: T.Effect<this["R"], this["E"], this["A"]>
}

const RunFixedInstance = PV2.instance<PV2FX.Run<EffectFixedCustomF>>(null as any)

// const RunFixedInstance = PV2.instance<PV2.Run<EffectF>>(
//   null as any
// )

const RunFixedTest = RunFixedInstance.either(
  null as any as T.Effect<{ envA: "ENV_A" }, string[], "A">
)
assert<
  IsExact<
    typeof RunFixedTest,
    T.Effect<{ envA: "ENV_A" }, string[], EI.Either<string[], "A">>
  >
>(true)

/*
const ChainRecInstance = P.instance<P.ChainRec<[P.URI<EffectURI>], T.V>>(
  null as any
)
// const ChainRecInstance = PV2.instance<PV2.ChainRec<EffectF>>(
//   null as any
// )
const ChainRecTest = pipe(
  fa,
  ChainRecInstance.orElseEither(
    null as any as T.Effect<{ resultA: "A" }, "E_B", { resultB: "B" }>
  )
)
assert<
  IsExact<
    typeof ChainRecTest,
    T.Effect<{ envA: "ENV_A" }, "E_A" | "E_B", { resultB: "B" }>
    >
  >(true)
*/

const covariantTest = pipe(
  fa,
  T.Covariant.map(({ resultA }) => resultA)
)
assert<IsExact<typeof covariantTest, T.Effect<{ envA: "ENV_A" }, "E_A", "A">>>(true)

const failTest = T.Fail.fail("E" as const)
assert<IsExact<typeof failTest, T.Effect<unknown, "E", never>>>(true)

const runTest = T.Run.either(fa)
assert<
  IsExact<
    typeof runTest,
    T.Effect<{ envA: "ENV_A" }, never, Either<"E_A", { resultA: "A" }>>
  >
>(true)

const accessTest = T.Access.access((r: { a: "A" }) => r.a)
assert<IsExact<typeof accessTest, T.Effect<{ a: "A" }, never, "A">>>(true)

const provideTest = pipe(fa, T.Provide.provide({ envA: "ENV_A" as const }))
assert<IsExact<typeof provideTest, T.Effect<unknown, "E_A", { resultA: "A" }>>>(true)

// -------------------------------------------------------------------------------------
// Typeclasses
// -------------------------------------------------------------------------------------

const A = null as any as T.Effect<{ envA: "ENV_A" }, "E_A", "A">
const B = null as any as T.Effect<{ envB: "ENV_B" }, "E_B", "B">
const VALIDATION_A = null as any as T.Effect<{ envA: "ENV_A" }, string[], "A">
const VALIDATION_B = null as any as T.Effect<{ result: "A" }, string[], "B">

// @todo: remove I param
const AB = null as any as T.Effect<{ envA: "ENV_A" }, "E_A", { result: "A" }>
const BC = null as any as T.Effect<{ result: "A" }, "E_B", "B">
export const categoryId: T.Effect<unknown, never, unknown> = T.Category.id()
export const categoryCompose: T.Effect<{ envA: "ENV_A" }, "E_A" | "E_B", "B"> = pipe(
  AB,
  T.Category.compose(BC)
)

export const validationApplicative: T.Effect<
  { result: "A" } & { envA: "ENV_A" },
  string[],
  Tuple<["A", "B"]>
> = pipe(
  VALIDATION_A,
  T.getValidationApplicative(
    makeAssociative((a: string[], b: string[]) => [...a, ...b])
  ).both(VALIDATION_B)
)

const arrayAssociative = makeAssociative((a: string[], b: string[]) => [...a, ...b])
export const validationApplicativeFailing = pipe(
  VALIDATION_A,
  T.getValidationApplicative(
    arrayAssociative
    // @ts-expect-error
  ).both(B)
)

// -------------------------------------------------------------------------------------
// DSL
// -------------------------------------------------------------------------------------
export const structFixedExample: T.Effect<
  { envA: "ENV_A" } & { result: "A" },
  string[],
  { a: "A"; b: "B" }
> = PV2.structF(T.getValidationApplicative(arrayAssociative))({
  a: VALIDATION_A,
  b: VALIDATION_B
})

PV2.structF(T.getValidationApplicative(arrayAssociative))({
  // @ts-expect-error
  a: A
})

export const structExample: T.Effect<
  { envA: "ENV_A" } & { envB: "ENV_B" },
  "E_A" | "E_B",
  { a: "A"; b: "B" }
> = PV2.structF(T.Applicative)({
  a: A,
  b: B
})

export const tupleFFixedExample: T.Effect<
  { envA: "ENV_A" } & { result: "A" },
  string[],
  ["A", "B"]
> = PV2.tupleF(T.Applicative)(VALIDATION_A, VALIDATION_B)
export const tupleFExample: T.Effect<
  { envA: "ENV_A" } & { envB: "ENV_B" },
  "E_A" | "E_B",
  ["A", "B"]
> = PV2.tupleF(T.Applicative)(A, B)

// @ts-expect-error
PV2.tupleF(T.getValidationApplicative(arrayAssociative))(A)

type ADT =
  | { _tag: "A"; a: string }
  | { _tag: "B"; b: string }
  | { _tag: "C"; c: string }

export const matchTest: T.Effect<
  { A: string },
  never,
  string | { _tag: "B"; b: string } | { _tag: "C"; c: string }
> = pipe(
  T.succeed<ADT>({ _tag: "A", a: "a" }),
  T.chain(
    T.matchTag(
      {
        A: ({ a }) => T.access((_: { A: string }) => `${_.A} - ${a}`)
      },
      (bc) => T.succeed(bc)
    )
  )
)

export const matchTestNoFallback: T.Effect<
  { A: string } & { envA: "ENV_A" } & { B: number } & { envB: "ENV_B" } & { C: string },
  "E_A" | "E_B",
  string
> = pipe(
  T.succeed<ADT>({ _tag: "A", a: "a" }),
  T.chain(
    T.matchTag(
      {
        A: ({ a }) =>
          pipe(
            T.access((_: { A: string }) => `${_.A} - ${a}`),
            T.chain((_) => A)
          ),
        B: ({ b }) =>
          pipe(
            T.access((_: { B: number }) => `${_.B} - ${b}`),
            T.chain((_) => B)
          ),
        C: ({ c }) => T.access((_: { C: string }) => `${_.C} - ${c}`)
      },
      (bc) => T.succeed(bc)
    )
  )
)

export const matchInTest: T.Effect<
  { A: string } & { envA: "ENV_A" } & { B: number } & { envB: "ENV_B" } & { C: string },
  "E_A" | "E_B",
  string | number
> = pipe(
  T.succeed<ADT>({ _tag: "A", a: "a" }),
  T.chain(
    T.matchTagIn<ADT>()({
      A: ({ a }) =>
        pipe(
          T.access((_: { A: string }) => `${_.A} - ${a}`),
          T.chain((_) => A)
        ),
      B: ({ b }) =>
        pipe(
          T.access((_: { B: number }) => `${_.B} - ${b}`),
          T.chain((_) => B)
        ),
      C: ({ c }) => T.access((_: { C: string }) => 5)
    })
  )
)

export const matchInFallbackTest: T.Effect<
  { A: string } & { envA: "ENV_A" } & { C: string } & { B: number } & { envB: "ENV_B" },
  "E_A" | "E_B",
  number | "A" | "B"
> = pipe(
  T.succeed<ADT>({ _tag: "A", a: "a" }),
  T.chain(
    T.matchTagIn<ADT>()(
      {
        A: ({ a }) =>
          pipe(
            T.access((_: { A: string }) => `${_.A} - ${a}`),
            T.chain((_) => A)
          ),

        C: ({ c }) => T.access((_: { C: string }) => 5)
      },
      ({ b }) =>
        pipe(
          T.access((_: { B: number }) => `${_.B} - ${b}`),
          T.chain((_) => B)
        )
    )
  )
)

export const struct: T.Effect<unknown, string[], { a: number; b: boolean; c: never }> =
  T.struct({
    a: T.succeed(0),
    b: T.succeed(true),
    c: T.fail(["nope"])
  })

const xsFA = null as any as XS.XState<{ stateA: "STATE_A" }, "A">
const xsAnyTest = XS.getAny<"STATE">().any()
assert<IsExact<typeof xsAnyTest, XS.XState<"STATE", unknown>>>(true)

const xsCovariantTest = pipe(
  xsFA,
  XS.getCovariant<{ stateA: "STATE_A" }>().map((a) => a)
)
assert<IsExact<typeof xsCovariantTest, XS.XState<{ stateA: "STATE_A" }, "A">>>(true)

// @todo: next: implement a data type with state
// @todo: what's the deal with imports ???
// @todo: search for OrFix in preludeV1 and add fixed handling
// @todo: extend Typeclass in typeclasses
// @todo: check type classes
// @todo: next: foreach data types
// @todo: next: implement a data type X
// @todo: remove X, I (ask first -> what does it imply ? getTypeclass() everywhere ?)
// @todo: fixed E for Fail
// @todo: review against zio
// @todo: fix tests
// @todo: add docs/example of custom HKT

export interface EffectValidationF extends PV2.HKT {
  readonly type: PV2.Kind<EffectF, this["X"], this["I"], this["R"], string[], this["A"]>
}

// const blah: EffectValidationF["E"] = 5
// const FailFixed = PV2.instance<PV2.FX.Fail<EffectValidationF>>({
//   fail: (e) => null as any // T.fail
// })

// I care about:
// - dsl methods
// - infer methods
// - fixed types
// - S & I params

export const ApplicativeFixed = P.instance<
  P.Applicative<[URI<EffectURI>], T.V & P.Fix<"E", string[]>>
>({
  ...T.Any,
  ...T.Covariant,
  ...T.AssociativeBoth
})

// @todo: fix fail when e fixed
// const FailFixed = P.instance<FX.Fail<[URI<EffectURI>], T.V & P.Fix<"E", string[]>>>({
//   fail: (_e) => T.fail([""])
// })
//
// const blah = pipe(T.succeed(4), ApplicativeFixed.both(T.fail([""])))
