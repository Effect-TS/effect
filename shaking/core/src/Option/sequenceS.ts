import { sequenceS as SS } from "fp-ts/lib/Apply"

import { option } from "./instances"

export const sequenceS = SS(option)
