// ets_tracing: off

import * as F from "@effect-ts/system/IO"

import * as P from "../PreludeV2/index.js"

export interface IOF extends P.HKT {
  readonly type: F.IO<this["A"]>
}

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<IOF>>({
  any: () => F.succeed({})
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<IOF>>({
  map: F.map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<IOF>>({
  both: F.zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<IOF>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<IOF>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<IOF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<IOF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
