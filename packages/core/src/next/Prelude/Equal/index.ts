import { Any1 } from "../Any"
import { AssociativeBoth1 } from "../AssociativeBoth"
import { AssociativeEither1 } from "../AssociativeEither"
import { Contravariant1 } from "../Contravariant"
import { IdentityBoth1 } from "../IdentityBoth"
import { IdentityEither1 } from "../IdentityEither"
import { None1 } from "../None"

/**
 * @category definitions
 */

export interface Equal<A> {
  equals: (y: A) => (x: A) => boolean
}

export const URI = "Equal"
export type URI = typeof URI

declare module "../HKT" {
  interface URItoKind<A> {
    [URI]: Equal<A>
  }
}

export function make<A>(f: (x: A, y: A) => boolean): Equal<A> {
  return {
    equals: (y) => (x) => f(x, y)
  }
}

export const AnyEqual: Equal<unknown> = make(() => true)

export const NothingEqual: Equal<never> = make(() => false)

/**
 * The `AssociativeBoth` instance for `Equal`.
 */
export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  both: (fb) => (fa) =>
    make(([x0, x1], [y0, y1]) => fa.equals(y0)(x0) && fb.equals(y1)(x1))
}

/**
 * The `AssociativeEither` instance for `Equal`.
 */
export const AssociativeEither: AssociativeEither1<URI> = {
  URI,
  either: (fb) => (fa) =>
    make((ex, ey) =>
      ex._tag === "Left" && ey._tag === "Left"
        ? fa.equals(ey.left)(ex.left)
        : ex._tag === "Right" && ey._tag === "Right"
        ? fb.equals(ey.right)(ex.right)
        : false
    )
}

/**
 * The `Contravariant` instance for `Equal`.
 */
export const Contravariant: Contravariant1<URI> = {
  URI,
  contramap: (f) => (fa) => make((x, y) => fa.equals(f(y))(f(x)))
}

/**
 * The `Any` instance for `Equal`.
 */
export const Any: Any1<URI> = {
  URI,
  any: () => AnyEqual
}

/**
 * The `IdentityBoth` instance for `Equal`.
 */
export const IdentityBoth: IdentityBoth1<URI> = {
  ...Any,
  ...AssociativeBoth
}

/**
 * The `None` instance for `Equal`.
 */
export const None: None1<URI> = {
  URI,
  none: () => NothingEqual
}

/**
 * The `IdentityEither` instance for `Equal`.
 */
export const IdentityEither: IdentityEither1<URI> = {
  ...None,
  ...AssociativeEither
}

/**
 * @category api
 */

export const both = AssociativeBoth.both

export const contramap = Contravariant.contramap

export const either = AssociativeEither.either

export function strict<A>() {
  return make<A>((x, y) => x === y)
}
