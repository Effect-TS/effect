// ets_tracing: off

import * as P from "../../PreludeV2/index.js"
import type { SyncF } from "./instances.js"
import { Applicative, Fail, Monad, Run } from "./instances.js"

export const tuple = P.tupleF(Applicative)

export const struct = P.structF(Applicative)

export const getValidationApplicative = P.getValidationF({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers<SyncF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<SyncF>()
const branch_ = P.conditionalF_<SyncF>()

export { branch as if, branch_ as if_ }
