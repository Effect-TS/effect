import * as P from "../../Prelude"
import { Applicative, Monad, Traversable } from "./instances"

/**
 * `Traversable`'s `sequenceF` derivation
 */
export const sequenceF = P.sequenceF(Traversable)

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
