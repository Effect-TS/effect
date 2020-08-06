import { AssociativeBoth1 } from "../AssociativeBoth"
import { AssociativeEither1 } from "../AssociativeEither"
import { Contravariant1 } from "../Contravariant"
import { IdentityBoth1 } from "../IdentityBoth"
import { IdentityEither1 } from "../IdentityEither"

/**
 * @category definitions
 */

export interface Equal<A> {
  (y: A): (x: A) => boolean
}

export const URI = "Equal"
export type URI = typeof URI

declare module "../HKT" {
  interface URItoKind<A> {
    [URI]: Equal<A>
  }
}

/**
 * @category constructors
 */

export function make<A>(f: (x: A, y: A) => boolean): Equal<A> {
  return (y) => (x) => f(x, y)
}

export const AnyEqual: Equal<unknown> = make(() => true)

export const NothingEqual: Equal<never> = make(() => false)

/**
 * @category instances
 */

export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  both: (fb) => (fa) => make(([x0, x1], [y0, y1]) => fa(y0)(x0) && fb(y1)(x1))
}

export const AssociativeEither: AssociativeEither1<URI> = {
  URI,
  either: (fb) => (fa) =>
    make((ex, ey) =>
      ex._tag === "Left" && ey._tag === "Left"
        ? fa(ey.left)(ex.left)
        : ex._tag === "Right" && ey._tag === "Right"
        ? fb(ey.right)(ex.right)
        : false
    )
}

export const Contravariant: Contravariant1<URI> = {
  URI,
  contramap: (f) => (fa) => make((x, y) => fa(f(y))(f(x)))
}

export const IdentityBoth: IdentityBoth1<URI> = {
  URI,
  any: () => AnyEqual,
  both: AssociativeBoth.both
}

export const IdentityEither: IdentityEither1<URI> = {
  URI,
  none: () => NothingEqual,
  either: AssociativeEither.either
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
