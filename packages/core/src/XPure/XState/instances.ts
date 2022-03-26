// ets_tracing: off

import { constant } from "@effect-ts/system/Function"
import * as F from "@effect-ts/system/XPure"

import * as P from "../../PreludeV2/index.js"
import type { XStateF } from "./definition.js"
import { map, zip } from "./operations.js"

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = <S>() =>
  P.instance<P.Any<XStateF<S>>>({
    any: () => F.succeed(constant({}))
  })

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = <S>() =>
  P.instance<P.Covariant<XStateF<S>>>({
    map
  })

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = <S>() =>
  P.instance<P.AssociativeBoth<XStateF<S>>>({
    both: zip
  })

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = <S>() =>
  P.instance<P.AssociativeFlatten<XStateF<S>>>({
    flatten: (ffa) => F.chain_(ffa, (x) => x)
  })

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = <S>() =>
  P.instance<P.IdentityFlatten<XStateF<S>>>({
    ...Any(),
    ...AssociativeFlatten()
  })

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = <S>() =>
  P.instance<P.Monad<XStateF<S>>>({
    ...Any(),
    ...Covariant(),
    ...AssociativeFlatten()
  })

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = <S>() => P.getApplicativeF(Monad())
