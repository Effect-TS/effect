/**
 * The `Eq` type class represents types which support decidable equality.
 *
 * Instances must satisfy the following laws:
 *
 * 1. Reflexivity: `E.equals(a, a) === true`
 * 2. Symmetry: `E.equals(a, b) === E.equals(b, a)`
 * 3. Transitivity: if `E.equals(a, b) === true` and `E.equals(b, c) === true`, then `E.equals(a, c) === true`
 *
 * @since 2.0.0
 */
import type { Contravariant1 } from "fp-ts/lib/Contravariant"

import { URI } from "./URI"
import { contramap_ } from "./contramap"

/**
 * @since 2.0.0
 */
export const eq: Contravariant1<URI> = {
  URI,
  contramap: contramap_
}
