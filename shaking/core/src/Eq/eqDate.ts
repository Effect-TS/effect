import type { Eq } from "fp-ts/lib/Eq"

import { contramap_ } from "./eq"
import { eqNumber } from "./eqNumber"

export const eqDate: Eq<Date> = contramap_(eqNumber, (date) => date.valueOf())
