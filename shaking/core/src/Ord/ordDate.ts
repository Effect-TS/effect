import type { Ord } from "./Ord"
import { contramap_ } from "./contramap"
import { ordNumber } from "./ordNumber"

/**
 * @since 2.0.0
 */
export const ordDate: Ord<Date> = contramap_(ordNumber, (date) => date.valueOf())
