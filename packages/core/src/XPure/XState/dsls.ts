// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { XStateF } from "./definition.js"
import { applicative, monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = <S>() => DSL.structF(applicative<S>())

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = <S>() => DSL.tupleF(applicative<S>())

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
export const getDo = <S>() => DSL.getDo<XStateF<S>>(monad<S>())

/**
 * Generator
 */
export const gen = <S>() => DSL.genF(monad<S>())
