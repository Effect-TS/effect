import * as FA from "@effect-ts/system/FreeAssociative"

import { flow } from "../../Function"
import type { FreeAssociativeURI } from "../../Modules"
import * as P from "../../Prelude"
import { makeAssociative } from "../Associative"
import { makeIdentity } from "../Identity"
import * as O from "../Option"

export const getAssociative = <A>() =>
  makeAssociative<FA.FreeAssociative<A>>((r) => (l) => new FA.Concat(l, r))

export const getIdentity = <A>() =>
  makeIdentity<FA.FreeAssociative<A>>(FA.init<A>(), (r) => (l) => new FA.Concat(l, r))

export const Covariant = P.instance<P.Covariant<[FreeAssociativeURI]>>({
  map: FA.map
})

export const Filter = P.instance<P.Filter<[FreeAssociativeURI]>>({
  filter: FA.filter
})

export const FilterMap = P.instance<P.FilterMap<[FreeAssociativeURI]>>({
  filterMap: (f) =>
    flow(
      FA.map(f),
      FA.filter(O.isSome),
      FA.map((x) => (x as O.Some<any>).value)
    )
})
