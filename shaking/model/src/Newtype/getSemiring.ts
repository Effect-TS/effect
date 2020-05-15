import type { Semiring } from "fp-ts/lib/Semiring"

import type { AnyNewtype, CarrierOf } from "./types"

/**
 * @since 0.2.0
 */
export const getSemiring = <S extends AnyNewtype>(
  S: Semiring<CarrierOf<S>>
): Semiring<S> => S
