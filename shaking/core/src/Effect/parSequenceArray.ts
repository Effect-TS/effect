import { array } from "fp-ts/lib/Array"

import { parEffect } from "./parEffect"

export const parSequenceArray = array.sequence(parEffect)
