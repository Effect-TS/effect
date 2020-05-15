import type { AnyNewtype, CarrierOf } from "./types"

import type { Ord } from "@matechs/core/Ord"

/**
 * @since 0.2.0
 */
export const getOrd = <S extends AnyNewtype>(O: Ord<CarrierOf<S>>): Ord<S> => O
