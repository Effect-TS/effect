import * as P from "../Prelude"
import { Applicative, Covariant, ForEeach, Monad } from "./instances"

/**
 * `ForEeach`'s `sequenceF` derivation
 */
export const sequenceF = P.sequenceF(ForEeach)

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
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)
