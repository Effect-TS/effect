import * as F from "@effect-ts/system/XPure"

import type { XIOURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export { XIOURI } from "../../Modules"

export interface XIO<A> extends F.XPure<unknown, unknown, unknown, never, A> {}

/**
 * Lift a sync (non failable) computation
 */
export const sync: <A>(f: () => A) => XIO<A> = F.sync

/**
 * Combines this computation with the specified computation.
 */
export const zip: <B>(fb: XIO<B>) => <A>(fa: XIO<A>) => XIO<readonly [A, B]> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, B>(f: (a: A) => XIO<B>) => (self: XIO<A>) => XIO<B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: XIO<A>) => XIO<B> = F.map

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => XIO<A> = (a) => F.succeed(() => a)

/**
 * Run the computation
 */
export const run = <A>(self: XIO<A>): A => F.runIO(self)

//
// Instances
//

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<[XIOURI]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<[XIOURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XIOURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XIOURI]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XIOURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<[XIOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<[XIOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * Struct based applicative for IO[+_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A>(f: (a: A) => XIO<any>) => (self: XIO<A>) => XIO<A> = F.tap
