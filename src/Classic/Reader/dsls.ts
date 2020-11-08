import * as DSL from "../../Prelude/DSL"
import { Applicative, Covariant } from "./instances"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple based applicative for Reader[-_, +_]
 */
export const tuple = DSL.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = DSL.matchers(Covariant)
