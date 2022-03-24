// ets_tracing: off

import type { XStateF } from "@effect-ts/core/XPure/XState/definition"

import * as P from "../../PreludeV2/index.js"
import { applicative, monad } from "./instances.js"

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = <S>() => P.structF(applicative<S>())

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const tuple = <S>() => P.tupleF(applicative<S>())

/**
 * Matchers
 */
export const matchers = <S>() => P.matchers<XStateF<S>>()

/**
 * Conditionals
 */
const branch = <S>() => P.conditionalF<XStateF<S>>()

const branch_ = <S>() => P.conditionalF_<XStateF<S>>()

export { branch as if, branch_ as if_ }

/**
 * Do
 */
export const getDo = <S>() => P.getDo<XStateF<S>>(monad<S>())

/**
 * Generator
 */
export const gen = <S>() => P.genF(monad<S>())
