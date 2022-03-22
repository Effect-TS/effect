// ets_tracing: off

import type * as O from "../../../Option/index.js"
import * as P from "../../../PreludeV2/index.js"
import { isOption } from "../../../Utils/index.js"
import type { ArrayF } from "./instances.js"
import { Applicative, ApplyZip, ForEach, Monad } from "./instances.js"
import type * as AR from "./operations.js"

export const sequence = P.sequenceF(ForEach)

const adapter: {
  <A>(_: () => O.Option<A>): P.GenLazyHKT<AR.Array<A>, A>
  <A>(_: () => AR.Array<A>): P.GenLazyHKT<AR.Array<A>, A>
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

export const tupleZip = P.tupleF(ApplyZip)

export const structZip = P.structF(ApplyZip)

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
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers<ArrayF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<ArrayF>()
const branch_ = P.conditionalF_<ArrayF>()

export { branch as if, branch_ as if_ }
