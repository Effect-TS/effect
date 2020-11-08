import "./Integrations"

import * as T from "@effect-ts/system/Effect"

import type { EffectCategoryURI, EffectURI } from "../Modules"
import * as P from "../Prelude"
import * as DSL from "../Prelude/DSL"

export * from "@effect-ts/system/Effect"
export { EffectURI } from "../Modules"

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

export const getValidationApplicative = DSL.getValidationF<[EffectURI], V>({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

export const Category = P.instance<P.Category<[EffectCategoryURI], V>>({
  id: T.environment,
  compose: T.compose
})

export const gen_ = DSL.genF(Monad)

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = DSL.matchers(Covariant)
