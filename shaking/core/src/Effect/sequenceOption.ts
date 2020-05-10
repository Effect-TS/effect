import { option } from "fp-ts/lib/Option"

import { effect } from "./effect"

export const sequenceOption = option.sequence(effect)
