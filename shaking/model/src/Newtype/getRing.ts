import type { Ring } from "fp-ts/lib/Ring"

import type { AnyNewtype, CarrierOf } from "./types"

/**
 * @since 0.2.0
 */
export const getRing = <S extends AnyNewtype>(R: Ring<CarrierOf<S>>): Ring<S> => R
