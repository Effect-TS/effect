import { AnyNewtype, CarrierOf } from "./types"

import type { Monoid } from "@matechs/core/Monoid"

/**
 * @since 0.2.0
 */
export const getMonoid = <S extends AnyNewtype>(M: Monoid<CarrierOf<S>>): Monoid<S> => M
