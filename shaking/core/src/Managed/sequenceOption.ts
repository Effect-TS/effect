import { sequence } from "../Option"

import { managed } from "./managed"

export const sequenceOption = sequence(managed)
