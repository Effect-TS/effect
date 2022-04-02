// ets_tracing: off

import * as DSL from "../Prelude/DSL/index.js"
import type { ReaderF } from "./definition.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple based applicative for Reader[-_, +_]
 */
export const tuple = DSL.tupleF(Applicative)

export const gen = DSL.genF(Monad)

const { bind, do: do_, let: let_ } = DSL.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<ReaderF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<ReaderF>()
const branch_ = DSL.conditionalF_<ReaderF>()

export { branch as if, branch_ as if_ }
