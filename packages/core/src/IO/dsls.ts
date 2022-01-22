// ets_tracing: off

import * as A from "../Collections/Immutable/Array/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import type { IOF } from "./instances.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for IO[+_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple based applicative for IO[+_]
 */
export const tuple = DSL.tupleF(Applicative)

/**
 * Initialize Do
 */
const { bind, do: do_, let: let_ } = DSL.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = DSL.matchers<IOF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<IOF>()
const branch_ = DSL.conditionalF_<IOF>()

export { branch as if, branch_ as if_ }

/**
 * Foreach
 */
export const forEachArray = A.forEachF(Applicative)
export const forEachWithIndexArray = A.forEachWithIndexF(Applicative)
