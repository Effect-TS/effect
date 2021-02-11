import * as FA from "@effect-ts/system/FreeAssociative"

import { makeAssociative } from "../Associative"
import { makeIdentity } from "../Identity"
import * as P from "../Prelude"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI
export const EffectCategoryURI = "EffectCategory"
export type EffectCategoryURI = typeof EffectCategoryURI

export const FreeAssociativeURI = "FreeAssociative"
export type FreeAssociativeURI = typeof FreeAssociativeURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [FreeAssociativeURI]: FA.FreeAssociative<A>
  }
}

export const getAssociative = <A>() => makeAssociative<FA.FreeAssociative<A>>(FA.concat)

export const getIdentity = <A>() =>
  makeIdentity<FA.FreeAssociative<A>>(FA.init<A>(), FA.concat)

export const Covariant = P.instance<P.Covariant<[FreeAssociativeURI]>>({
  map: FA.map
})

export const Filter = P.instance<P.Filter<[FreeAssociativeURI]>>({
  filter: FA.filter
})

export const FilterMap = P.instance<P.FilterMap<[FreeAssociativeURI]>>({
  filterMap: FA.filterMap
})
