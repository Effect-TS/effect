import * as DSL from "../../Prelude/DSL"
import { Applicative } from "./instances"

/**
 * Struct based applicative for IO[+_]
 */
export const struct = DSL.structF(Applicative)
