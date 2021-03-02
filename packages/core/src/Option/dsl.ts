import * as P from "../Prelude"
import { Applicative, Covariant, Monad } from "./operations"

export const gen = P.genF(Monad)

export const bind = P.bindF(Monad)

const let_ = P.letF(Monad)

const do_ = P.doF(Monad)()

export { do_ as do, let_ as let }

export { branch as if, branch_ as if_ }

export const struct = P.structF({ ...Monad, ...Applicative })

export const tuple = P.tupleF({ ...Monad, ...Applicative })

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)
