import { not } from "../Function"

import { isNil } from "./isNil"

export const nonEmpty = not(isNil)
