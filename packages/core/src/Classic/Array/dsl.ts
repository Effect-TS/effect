import * as P from "../../Prelude"
import { isOption } from "../../Utils"
import type * as O from "../Option"
import { Applicative, Covariant, Monad, Traversable } from "./instances"
import * as A from "./operations"

export const sequence = P.sequenceF(Traversable)

const adapter: {
  <A>(_: O.Option<A>): P.GenHKT<A.Array<A>, A>
  <A>(_: A.Array<A>): P.GenHKT<A.Array<A>, A>
} = (_: any) => {
  if (isOption(_)) {
    return new P.GenHKT(_._tag === "None" ? [] : [_.value])
  }
  return new P.GenHKT(_)
}

export const gen = P.genWithHistoryF(Monad, {
  adapter
})

export const tuple = P.tupleF(Applicative)

export const struct = P.structF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = P.matchers(Covariant)
