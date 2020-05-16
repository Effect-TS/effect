import { sequenceS as SS } from "../Apply"

import { parManaged } from "./managed"

export const parSequenceS = SS(parManaged)
