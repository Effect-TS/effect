import { sequence } from "../Record"

import { parManaged } from "./managed"

export const parSequenceRecord = sequence(parManaged)
