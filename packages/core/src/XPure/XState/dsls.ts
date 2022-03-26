// ets_tracing: off

import type { XStateF } from "@effect-ts/core/XPure/XState/definition"

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Applicative, Monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = <S>() => DSL.structF(Applicative<S>())

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = <S>() => DSL.tupleF(Applicative<S>())

/**
 * Matchers
 */
export const matchers = <S>() => DSL.matchers<XStateF<S>>()

/**
 * Conditionals
 */
const branch = <S>() => DSL.conditionalF<XStateF<S>>()

const branch_ = <S>() => DSL.conditionalF_<XStateF<S>>()

export { branch as if, branch_ as if_ }

/**
 * Do
 */
export const getDo = <S>() => DSL.getDo<XStateF<S>>(Monad<S>())

/**
 * Generator
 */
export const gen = <S>() => DSL.genF(Monad<S>())
