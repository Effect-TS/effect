import type { Eq } from "./Eq"
import { contramap_ } from "./contramap"
import { eqNumber } from "./eqNumber"

/**
 * @since 2.0.0
 */
export const eqDate: Eq<Date> = contramap_(eqNumber, (date) => date.valueOf())
