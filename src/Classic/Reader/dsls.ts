import * as DSL from "../../Prelude/DSL"
import { Applicative } from "./instances"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple based applicative for Reader[-_, +_]
 */
export const tuple = DSL.tupleF(Applicative)
