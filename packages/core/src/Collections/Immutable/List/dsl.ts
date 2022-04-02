// ets_tracing: off

import * as DSL from "../../../Prelude/DSL/index.js"
import * as P from "../../../Prelude/index.js"
import type { ListF } from "./instances.js"
import { Applicative, ApplyZip, ForEach, Monad } from "./instances.js"

/**
 * `ForEach`'s `sequenceF` derivation
 */
export const sequenceF = P.sequenceF(ForEach)

/**
 * Generator
 */
export const gen = DSL.genWithHistoryF(Monad)

/**
 * Struct derivation
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple derivation
 */
export const tuple = DSL.tupleF(Applicative)

/**
 * Struct derivation
 */
export const structZip = DSL.structF(ApplyZip)

/**
 * Tuple derivation
 */
export const tupleZip = DSL.tupleF(ApplyZip)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<ListF>()
