import { sequenceT as ST } from "../Apply"

import { parManaged } from "./managed"

export const parSequenceT = ST(parManaged)
