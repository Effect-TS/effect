// ets_tracing: off

import type { XReaderF } from "@effect-ts/core/XPure/XReader/definition"

import * as P from "../../PreludeV2/index.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = P.structF(Applicative)

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers<XReaderF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<XReaderF>()
const branch_ = P.conditionalF_<XReaderF>()

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
