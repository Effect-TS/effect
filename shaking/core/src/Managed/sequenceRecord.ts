import { sequence } from "../Record"

import { managed } from "./managed"

export const sequenceRecord = sequence(managed)
