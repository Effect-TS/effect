import { sequenceT as ST } from "../Apply"

import { effectOptionPar } from "./effectOption"

export const parSequenceT = ST(effectOptionPar)
