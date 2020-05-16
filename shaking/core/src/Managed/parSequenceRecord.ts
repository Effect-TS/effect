import { sequence } from "../Record/sequence"

import { parManaged } from "./managed"

export const parSequenceRecord = sequence(parManaged)
