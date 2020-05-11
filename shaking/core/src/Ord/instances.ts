import type { Contravariant1 } from "fp-ts/lib/Contravariant"
import { pipeable } from "fp-ts/lib/pipeable"

import { URI } from "./URI"
import { contramap_ } from "./contramap"

/**
 * @since 2.0.0
 */
export const ord: Contravariant1<URI> = {
  URI,
  contramap: contramap_
}
