// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { Applicative, Covariant, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = P.structF(Applicative)

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }

/**
 * Do
 */

export const bind = P.bindF(Monad)

const let_ = P.letF(Monad)

const do_ = P.doF(Monad)

export { do_ as do, let_ as let }

/**
 * Generator
 */
export const gen = P.genF(Monad)
