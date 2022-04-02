// ets_tracing: off
import * as DSL from "../../Prelude/DSL/index.js"
import type { SyncF } from "./instances.js"
import { Applicative, Fail, Monad, Run } from "./instances.js"

export const tuple = DSL.tupleF(Applicative)

export const struct = DSL.structF(Applicative)

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<SyncF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<SyncF>()
const branch_ = DSL.conditionalF_<SyncF>()

export { branch as if, branch_ as if_ }
