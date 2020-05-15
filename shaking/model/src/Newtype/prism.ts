import { Prism } from "../Monocle"

import type { AnyNewtype, CarrierOf } from "./types"

import { identity, Predicate } from "@matechs/core/Function"
import { none, some } from "@matechs/core/Option"

/**
 * @since 0.2.0
 */
export function prism<S extends AnyNewtype>(
  predicate: Predicate<CarrierOf<S>>
): Prism<CarrierOf<S>, S> {
  return new Prism((s) => (predicate(s) ? some(s) : none), identity)
}
