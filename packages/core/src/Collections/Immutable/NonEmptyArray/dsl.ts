// ets_tracing: off

import type * as O from "../../../Option/index.js"
import * as DSL from "../../../Prelude/DSL/index.js"
import * as P from "../../../Prelude/index.js"
import { isOption } from "../../../Utils/index.js"
import type { NonEmptyArrayF } from "./instances.js"
import { Applicative, ForEach, Monad } from "./instances.js"
import type { NonEmptyArray } from "./operations.js"

export const sequence = P.sequenceF(ForEach)

const adapter: {
  <A>(_: () => O.Option<A>): DSL.GenLazyHKT<NonEmptyArray<A>, A>
  <A>(_: () => NonEmptyArray<A>): DSL.GenLazyHKT<NonEmptyArray<A>, A>
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
  DSL.matchers<NonEmptyArrayF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<NonEmptyArrayF>()
const branch_ = DSL.conditionalF_<NonEmptyArrayF>()

export { branch as if, branch_ as if_ }
