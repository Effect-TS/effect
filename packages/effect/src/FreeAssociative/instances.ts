import * as FA from "@effect-ts/system/FreeAssociative"

import { makeAssociative } from "../Associative"
import { makeIdentity } from "../Identity"
import type { FreeAssociativeURI } from "../Modules"
import * as P from "../Prelude"

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
