import { Iso } from "../Monocle"

import { anyIso } from "./anyIso"
import type { AnyNewtype, CarrierOf } from "./types"

/**
 * @since 0.2.0
 */
export function iso<S extends AnyNewtype>(): Iso<S, CarrierOf<S>> {
  return anyIso
}
