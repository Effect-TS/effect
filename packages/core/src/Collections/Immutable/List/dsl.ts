// ets_tracing: off

import * as P from "../../../Prelude"
import { Applicative, ApplyZip, Covariant, ForEach, Monad } from "./instances"

/**
 * `ForEach`'s `sequenceF` derivation
 */
export const sequenceF = P.sequenceF(ForEach)

/**
 * Generator
 */
export const gen = P.genWithHistoryF(Monad)

/**
 * Struct derivation
 */
export const struct = P.structF(Applicative)

/**
 * Tuple derivation
 */
export const tuple = P.tupleF(Applicative)

/**
 * Struct derivation
 */
export const structZip = P.structF(ApplyZip)

/**
 * Tuple derivation
 */
export const tupleZip = P.tupleF(ApplyZip)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)
