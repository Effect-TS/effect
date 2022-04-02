// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { XIOF } from "./definition.js"
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
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = DSL.matchers<XIOF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<XIOF>()
const branch_ = DSL.conditionalF_<XIOF>()

export { branch as if, branch_ as if_ }

/**
 * Do
 */
const { bind, do: do_, let: let_ } = DSL.getDo(Monad)
export { do_ as do, let_ as let, bind }

/**
 * Generator
 */
export const gen = DSL.genF(Monad)
