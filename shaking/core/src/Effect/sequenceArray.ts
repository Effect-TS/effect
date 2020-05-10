import { array } from "fp-ts/lib/Array"

import { effect } from "./effect"

export const sequenceArray = array.sequence(effect)
