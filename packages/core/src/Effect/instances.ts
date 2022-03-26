// ets_tracing: off

import "../Operator/index.js"

import * as T from "@effect-ts/system/Effect"

import * as I from "../Identity/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import * as P from "../PreludeV2/index.js"

export * from "@effect-ts/system/Effect"
export { EffectURI } from "../Modules/index.js" // @todo: remove

export interface EffectF extends P.HKT {
  readonly type: T.Effect<this["R"], this["E"], this["A"]>
}

export interface EffectCategoryF extends P.HKT {
  readonly type: T.Effect<this["I"], this["E"], this["A"]>
}

export const Any = P.instance<P.Any<EffectF>>({
  any: () => T.succeed({})
})

export const AssociativeEither = P.instance<P.AssociativeEither<EffectF>>({
  orElseEither: T.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<EffectF>>({
  flatten: T.flatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<EffectF>>({
  both: T.zip
})

export const Covariant = P.instance<P.Covariant<EffectF>>({
  map: T.map
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<EffectF>>({
  ...Any,
  ...AssociativeFlatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<EffectF>>({
  ...Any,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<EffectF>>({
  ...IdentityFlatten,
  ...Covariant
})

export const Applicative = P.instance<P.Applicative<EffectF>>({
  ...Covariant,
  ...IdentityBoth
})

export const Fail = P.instance<P.FX.Fail<EffectF>>({
  fail: T.fail
})

export const Run = P.instance<P.FX.Run<EffectF>>({
  either: T.either
})

export const Access = P.instance<P.FX.Access<EffectF>>({
  access: T.access
})

export const Provide = P.instance<P.FX.Provide<EffectF>>({
  provide: T.provideAll
})

export const getValidationApplicative = DSL.getValidationF<EffectF>({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

export const Category = P.instance<P.Category<EffectCategoryF>>({
  id: T.environment,
  compose: T.compose
})

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<EffectF>()

/**
 * Derive sequential identity
 */
export function getIdentity<A>(Id: I.Identity<A>) {
  return <R = unknown, E = never>(): I.Identity<T.Effect<R, E, A>> =>
    I.makeIdentity(T.succeed(Id.identity) as T.Effect<R, E, A>, (x, y) =>
      T.zipWith_(x, y, Id.combine)
    )
}

/**
 * Derive parallel identity
 */
export function getIdentityPar<A>(Id: I.Identity<A>) {
  return <R = unknown, E = never>(): I.Identity<T.Effect<R, E, A>> =>
    I.makeIdentity(T.succeed(Id.identity) as T.Effect<R, E, A>, (x, y) =>
      T.zipWithPar_(x, y, Id.combine)
    )
}
