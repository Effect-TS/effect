// ets_tracing: off

import "../Operator/index.js"

import * as T from "@effect-ts/system/Effect"

import * as I from "../Identity/index.js"
import type * as P from "../Prelude/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import * as PV2 from "../PreludeV2/index.js"

export * from "@effect-ts/system/Effect"
export { EffectURI } from "../Modules/index.js" // @todo: remove

export type V = P.V<"R", "-"> & P.V<"E", "+">

export interface EffectF extends PV2.HKT {
  readonly type: T.Effect<this["R"], this["E"], this["A"]>
}

export interface EffectCategoryF extends PV2.HKT {
  readonly type: T.Effect<this["I"], this["E"], this["A"]>
}

export const Any = PV2.instance<PV2.Any<EffectF>>({
  any: () => T.succeed({})
})

export const AssociativeEither = PV2.instance<PV2.AssociativeEither<EffectF>>({
  orElseEither: T.orElseEither
})

export const AssociativeFlatten = PV2.instance<PV2.AssociativeFlatten<EffectF>>({
  flatten: T.flatten
})

export const AssociativeBoth = PV2.instance<PV2.AssociativeBoth<EffectF>>({
  both: T.zip
})

export const Covariant = PV2.instance<PV2.Covariant<EffectF>>({
  map: T.map
})

export const IdentityFlatten = PV2.instance<PV2.IdentityFlatten<EffectF>>({
  ...Any,
  ...AssociativeFlatten
})

export const IdentityBoth = PV2.instance<PV2.IdentityBoth<EffectF>>({
  ...Any,
  ...AssociativeBoth
})

export const Monad = PV2.instance<PV2.Monad<EffectF>>({
  ...IdentityFlatten,
  ...Covariant
})

export const Applicative = PV2.instance<PV2.Applicative<EffectF>>({
  ...Covariant,
  ...IdentityBoth
})

export const Fail = PV2.instance<PV2.FX.Fail<EffectF>>({
  fail: T.fail
})

export const Run = PV2.instance<PV2.FX.Run<EffectF>>({
  either: T.either
})

export const Access = PV2.instance<PV2.FX.Access<EffectF>>({
  access: T.access
})

export const Provide = PV2.instance<PV2.FX.Provide<EffectF>>({
  provide: T.provideAll
})

export const getValidationApplicative = DSL.getValidationF<EffectF>(
  Monad,
  Run,
  Fail,
  Applicative
)

export const Category = PV2.instance<PV2.Category<EffectCategoryF>>({
  id: T.environment,
  compose: T.compose
})

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  PV2.matchers<EffectF>()

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
