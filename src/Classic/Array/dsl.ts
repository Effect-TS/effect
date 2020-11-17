import * as P from "../../Prelude"
import { isOption } from "../../Utils"
import type * as O from "../Option"
import { Applicative, Covariant, Monad, Traversable } from "./instances"
import * as A from "./operations"

export const sequence = P.sequenceF(Traversable)

const adapter: {
  <A>(_: () => O.Option<A>): P.GenLazyHKT<A.Array<A>, A>
  <A>(_: () => A.Array<A>): P.GenLazyHKT<A.Array<A>, A>
} = (_: () => any) =>
  new P.GenLazyHKT(() => {
    const x = _()
    if (isOption(x)) {
      return x._tag === "None" ? [] : [x.value]
    }
    return x
  })

export const gen = P.genWithHistoryF(Monad, {
  adapter
})

export const tuple = P.tupleF(Applicative)

export const struct = P.structF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = P.matchers(Covariant)
