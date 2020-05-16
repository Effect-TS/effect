import { sequence } from "../Either"

import { managed } from "./managed"

export const sequenceEither = sequence(managed)
