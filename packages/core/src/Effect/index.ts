import * as T from "@effect-ts/system/Effect"

import * as I from "../Identity"
import * as P from "../Prelude"

export * from "@effect-ts/system/Effect"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI
export const EffectCategoryURI = "EffectCategory"
export type EffectCategoryURI = typeof EffectCategoryURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [EffectURI]: T.Effect<R, E, A>
    [EffectCategoryURI]: T.Effect<I, E, A>
  }
}

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[EffectURI], V>>({
  any: () => T.succeed({})
})

export const AssociativeEither = P.instance<P.AssociativeEither<[EffectURI], V>>({
  orElseEither: T.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[EffectURI], V>>({
  flatten: T.flatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[EffectURI], V>>({
  both: T.zip
})

export const Covariant = P.instance<P.Covariant<[EffectURI], V>>({
  map: T.map
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[EffectURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<[EffectURI], V>>({
  ...Any,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[EffectURI], V>>({
  ...IdentityFlatten,
  ...Covariant
})

export const Applicative = P.instance<P.Applicative<[EffectURI], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Fail = P.instance<P.FX.Fail<[EffectURI], V>>({
  fail: T.fail
})

export const Run = P.instance<P.FX.Run<[EffectURI], V>>({
  either: T.either
})

export const getValidationApplicative = P.getValidationF<[EffectURI], V>({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

export const Category = P.instance<P.Category<[EffectCategoryURI], V>>({
  id: T.environment,
  compose: T.compose
})

export const gen_ = P.genF(Monad)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)

/**
 * Derive sequential identity
 */
export function getIdentity<A>(Id: I.Identity<A>) {
  return <R = unknown, E = never>(): I.Identity<T.Effect<R, E, A>> =>
    I.makeIdentity(T.succeed(Id.identity) as T.Effect<R, E, A>, (y) => (x) =>
      T.zipWith_(x, y, (a, b) => Id.combine(b)(a))
    )
}

/**
 * Derive parallel identity
 */
export function getIdentityPar<A>(Id: I.Identity<A>) {
  return <R = unknown, E = never>(): I.Identity<T.Effect<R, E, A>> =>
    I.makeIdentity(T.succeed(Id.identity) as T.Effect<R, E, A>, (y) => (x) =>
      T.zipWithPar_(x, y, (a, b) => Id.combine(b)(a))
    )
}
