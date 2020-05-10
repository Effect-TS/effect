import { array } from "fp-ts/lib/Array"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceArray = array.sequence(parFastEffect)
