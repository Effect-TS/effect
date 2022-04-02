// ets_tracing: off

import * as Equal from "@effect-ts/system/Equal"

import * as P from "../Prelude/index.js"

export interface EqualF extends P.HKT {
  readonly type: Equal.Equal<this["A"]>
}

/**
 * The `AssociativeBoth` instance for `Equal`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<EqualF>>({
  both: Equal.both
})

/**
 * The `AssociativeEither` instance for `Equal`.
 */
export const AssociativeEither = P.instance<P.AssociativeEither<EqualF>>({
  orElseEither: Equal.orElseEither
})

/**
 * The `Contravariant` instance for `Equal`.
 */
export const Contravariant = P.instance<P.Contravariant<EqualF>>({
  contramap: Equal.contramap
})

/**
 * The `Any` instance for `Equal`.
 */
export const Any = P.instance<P.Any<EqualF>>({
  any: () => Equal.any
})

/**
 * The `IdentityBoth` instance for `Equal`.
 */
export const IdentityBoth = P.instance<P.IdentityBoth<EqualF>>({
  ...Any,
  ...AssociativeBoth
})

/**
 * The `None` instance for `Equal`.
 */
export const None = P.instance<P.None<EqualF>>({
  never: () => Equal.never
})

/**
 * The `IdentityEither` instance for `Equal`.
 */
export const IdentityEither = P.instance<P.IdentityEither<EqualF>>({
  ...None,
  ...AssociativeEither
})
