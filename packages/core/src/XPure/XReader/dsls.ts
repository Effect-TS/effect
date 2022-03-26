// ets_tracing: off

import type { XReaderF } from "@effect-ts/core/XPure/XReader/definition"

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = DSL.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<XReaderF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<XReaderF>()
const branch_ = DSL.conditionalF_<XReaderF>()

export { branch as if, branch_ as if_ }

/**
 * Do
 */
const { bind, do: do_, let: let_ } = DSL.getDo(Monad)

export { do_ as do, let_ as let, bind }

/**
 * Generator
 */
export const gen = DSL.genF(Monad)
