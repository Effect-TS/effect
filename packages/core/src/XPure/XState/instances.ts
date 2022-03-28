// ets_tracing: off

import { constant } from "@effect-ts/system/Function"
import * as F from "@effect-ts/system/XPure"

import * as DSL from "../../PreludeV2/DSL/index.js"
import * as P from "../../PreludeV2/index.js"
import type { XStateF } from "./definition.js"
import { map, zip } from "./operations.js"

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const any = <S>() =>
  P.instance<P.Any<XStateF<S>>>({
    any: () => F.succeed(constant({}))
  })

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const covariant = <S>() =>
  P.instance<P.Covariant<XStateF<S>>>({
    map
  })

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const associativeBoth = <S>() =>
  P.instance<P.AssociativeBoth<XStateF<S>>>({
    both: zip
  })

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const associativeFlatten = <S>() =>
  P.instance<P.AssociativeFlatten<XStateF<S>>>({
    flatten: (ffa) => F.chain_(ffa, (x) => x)
  })

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const identityFlatten = <S>() =>
  P.instance<P.IdentityFlatten<XStateF<S>>>({
    ...any(),
    ...associativeFlatten()
  })

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const monad = <S>() =>
  P.instance<P.Monad<XStateF<S>>>({
    ...any(),
    ...covariant(),
    ...associativeFlatten()
  })

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const applicative = <S>() => DSL.getApplicativeF(monad())
