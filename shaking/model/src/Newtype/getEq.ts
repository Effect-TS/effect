import type { AnyNewtype, CarrierOf } from "./types"

import type { Eq } from "@matechs/core/Eq"

/**
 * @since 0.3.0
 */
export const getEq = <S extends AnyNewtype>(S: Eq<CarrierOf<S>>): Eq<S> => S
