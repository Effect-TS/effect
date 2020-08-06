import { AssociativeBoth1 } from "../AssociativeBoth"
import { AssociativeEither1 } from "../AssociativeEither"
import { Contravariant1 } from "../Contravariant"
import { IdentityBoth1 } from "../IdentityBoth"

/**
 * @category definitions
 */

export interface Equal<A> {
  (x: A, b: A): boolean
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
  return f
}

export const AnyEqual: Equal<unknown> = make(() => true)

/**
 * @category instances
 */

export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  both: (fb) => (fa) => make(([x0, x1], [y0, y1]) => fa(x0, y0) && fb(x1, y1))
}

export const AssociativeEither: AssociativeEither1<URI> = {
  URI,
  either: (fb) => (fa) =>
    make((ex, ey) =>
      ex._tag === "Left" && ey._tag === "Left"
        ? fa(ex.left, ey.left)
        : ex._tag === "Right" && ey._tag === "Right"
        ? fb(ex.right, ey.right)
        : false
    )
}

export const Contravariant: Contravariant1<URI> = {
  URI,
  contramap: (f) => (fa) => make((x, y) => fa(f(x), f(y)))
}

export const IdentityBoth: IdentityBoth1<URI> = {
  URI,
  any: () => AnyEqual,
  both: AssociativeBoth.both
}

/**
 * @category api
 */

export const both = AssociativeBoth.both

export const contramap = Contravariant.contramap

export const either = AssociativeEither.either
