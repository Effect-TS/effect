import { Ord, contramap_ } from "./ord"
import { ordNumber } from "./ordNumber"

export const ordDate: Ord<Date> = contramap_(ordNumber, (date) => date.valueOf())
