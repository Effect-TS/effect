import { sequence } from "../Option/sequence"

import { eitherMonadClassic } from "./eitherMonadClassic"

export const sequenceOption = sequence(eitherMonadClassic)
