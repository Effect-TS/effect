// ets_tracing: off

import type * as O from "../../../Option/index.js"
import * as DSL from "../../../Prelude/DSL/index.js"
import * as P from "../../../Prelude/index.js"
import { isOption } from "../../../Utils/index.js"
import type { ArrayF } from "./instances.js"
import { Applicative, ApplyZip, ForEach, Monad } from "./instances.js"
import type * as AR from "./operations.js"

export const sequence = P.sequenceF(ForEach)

const adapter: {
  <A>(_: () => O.Option<A>): DSL.GenLazyHKT<AR.Array<A>, A>
  <A>(_: () => AR.Array<A>): DSL.GenLazyHKT<AR.Array<A>, A>
} = (_: () => any) =>
  new DSL.GenLazyHKT(() => {
    const x = _()
    if (isOption(x)) {
      return x._tag === "None" ? [] : [x.value]
    }
    return x
  })

export const gen = DSL.genWithHistoryF(Monad, {
  adapter
})

export const tupleZip = DSL.tupleF(ApplyZip)

export const structZip = DSL.structF(ApplyZip)

export const tuple = DSL.tupleF(Applicative)

export const struct = DSL.structF(Applicative)

/**
 * Do
 */
const { bind, do: do_, let: let_ } = DSL.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<ArrayF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<ArrayF>()
const branch_ = DSL.conditionalF_<ArrayF>()

export { branch as if, branch_ as if_ }
