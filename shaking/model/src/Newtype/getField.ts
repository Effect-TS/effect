import type { Field } from "fp-ts/lib/Field"

import type { AnyNewtype, CarrierOf } from "./types"

/**
 * @since 0.2.0
 */
export const getField = <S extends AnyNewtype>(F: Field<CarrierOf<S>>): Field<S> => F
