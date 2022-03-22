// ets_tracing: off

import type { XIOF } from "@effect-ts/core/XPure/XIO/definition"

import * as P from "../../PreludeV2/index.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for IO[+_]
 */
export const struct = P.structF(Applicative)

/**
 * Tuple based applicative for IO[+_]
 */
export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers<XIOF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<XIOF>()
const branch_ = P.conditionalF_<XIOF>()

export { branch as if, branch_ as if_ }

/**
 * Do
 */
const { bind, do: do_, let: let_ } = P.getDo(Monad)
export { do_ as do, let_ as let, bind }

/**
 * Generator
 */
export const gen = P.genF(Monad)
