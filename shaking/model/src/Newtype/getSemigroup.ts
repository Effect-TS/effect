import type { AnyNewtype, CarrierOf } from "./types"

import type { Semigroup } from "@matechs/core/Semigroup"

/**
 * @since 0.2.0
 */
export const getSemigroup = <S extends AnyNewtype>(
  S: Semigroup<CarrierOf<S>>
): Semigroup<S> => S
