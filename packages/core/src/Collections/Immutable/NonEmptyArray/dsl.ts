// ets_tracing: off

import type * as O from "../../../Option/index.js"
import * as P from "../../../PreludeV2/index.js"
import { isOption } from "../../../Utils/index.js"
import type { NonEmptyArrayF } from "./instances.js"
import { Applicative, ForEach, Monad } from "./instances.js"
import type { NonEmptyArray } from "./operations.js"

export const sequence = P.sequenceF(ForEach)

const adapter: {
  <A>(_: () => O.Option<A>): P.GenLazyHKT<NonEmptyArray<A>, A>
  <A>(_: () => NonEmptyArray<A>): P.GenLazyHKT<NonEmptyArray<A>, A>
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
 * Do
 */
const { bind, do: do_, let: let_ } = P.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers<NonEmptyArrayF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<NonEmptyArrayF>()
const branch_ = P.conditionalF_<NonEmptyArrayF>()

export { branch as if, branch_ as if_ }
