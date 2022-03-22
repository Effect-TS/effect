// ets_tracing: off

import type { ReaderF } from "@effect-ts/core/Reader/definition"

import * as P from "../PreludeV2/index.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = P.structF(Applicative)

/**
 * Tuple based applicative for Reader[-_, +_]
 */
export const tuple = P.tupleF(Applicative)

export const gen = P.genF(Monad)

const { bind, do: do_, let: let_ } = P.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers<ReaderF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<ReaderF>()
const branch_ = P.conditionalF_<ReaderF>()

export { branch as if, branch_ as if_ }
